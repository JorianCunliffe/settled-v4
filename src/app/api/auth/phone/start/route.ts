import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, normalisePhone } from "@/lib/session";

declare global {
  var otpRateLimit: Map<string, number[]> | undefined;
}

// In-memory limiter: 5 codes per phone per hour per instance. Production
// should back this with a durable store (see docs/ROADMAP.md phase 5).
const MAX_SENDS_PER_HOUR = 5;

function isRateLimited(phone: string): boolean {
  if (!globalThis.otpRateLimit) {
    globalThis.otpRateLimit = new Map();
  }

  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const sends = (globalThis.otpRateLimit.get(phone) ?? []).filter((at) => at > windowStart);

  if (sends.length >= MAX_SENDS_PER_HOUR) {
    return true;
  }

  sends.push(now);
  globalThis.otpRateLimit.set(phone, sends);
  return false;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { phone?: string };
  const phone = normalisePhone(body.phone ?? "");

  if (!phone) {
    return NextResponse.json(
      { message: "Enter a valid mobile number (e.g. 0400 123 456)." },
      { status: 400 },
    );
  }

  if (isRateLimited(phone)) {
    return NextResponse.json(
      { message: "Too many codes requested. Try again in an hour." },
      { status: 429 },
    );
  }

  if (isDemoMode()) {
    return NextResponse.json({ phone, demo: true });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return NextResponse.json(
      { message: "SMS sign-in is not configured. Set the Twilio Verify environment variables." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Channel: "sms" }),
      },
    );

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      return NextResponse.json(
        { message: payload.message ?? "Unable to send the verification code." },
        { status: 502 },
      );
    }

    return NextResponse.json({ phone, demo: false });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach the SMS provider. Try again shortly." },
      { status: 502 },
    );
  }
}
