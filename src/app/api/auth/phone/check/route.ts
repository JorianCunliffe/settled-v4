import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  demoOtpCode,
  isDemoMode,
  normalisePhone,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";
import { buildSessionUser, upsertUserByPhone } from "@/lib/users-db";

async function verifyWithTwilio(phone: string, code: string): Promise<boolean | string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return "SMS sign-in is not configured.";
  }

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Code: code }),
      },
    );

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { status?: string };
    return payload.status === "approved";
  } catch {
    return "Unable to reach the SMS provider. Try again shortly.";
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    phone?: string;
    code?: string;
    name?: string;
    organisationId?: string | null;
  };

  const phone = normalisePhone(body.phone ?? "");
  const code = (body.code ?? "").trim();

  if (!phone || !code) {
    return NextResponse.json({ message: "Phone and code are required." }, { status: 400 });
  }

  if (isDemoMode()) {
    if (code !== demoOtpCode) {
      return NextResponse.json(
        { message: `Demo mode: use code ${demoOtpCode}.` },
        { status: 401 },
      );
    }
  } else {
    const verified = await verifyWithTwilio(phone, code);

    if (typeof verified === "string") {
      return NextResponse.json({ message: verified }, { status: 502 });
    }

    if (!verified) {
      return NextResponse.json(
        { message: "That code didn't match. Check it and try again." },
        { status: 401 },
      );
    }
  }

  try {
    const user = await upsertUserByPhone({
      phone,
      name: body.name,
      organisationId: body.organisationId,
    });
    const sessionUser = await buildSessionUser(user);
    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json({ user: sessionUser, demo: isDemoMode() });
    response.cookies.set(sessionCookieName, token, sessionCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 500 },
    );
  }
}
