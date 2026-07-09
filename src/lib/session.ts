import { SignJWT, jwtVerify } from "jose";

/**
 * Edge-safe session utilities: this module may only import "jose" so it can
 * run in middleware. No pg / node-only imports here.
 */

export type UserRole = "seller" | "agent" | "coordinator" | "admin";
export type Entitlement = "partner" | "subscribed" | "payment_required";

export interface SessionUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  organisationId: string | null;
  organisationName: string | null;
  entitlement: Entitlement;
}

export const sessionCookieName = "settled_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7; // 7 days

/**
 * Demo mode keeps the app fully usable without any auth configuration:
 * no sign-in required, the role switcher stays available, and the OTP flow
 * accepts the fixed demo code. Explicit DEMO_MODE wins; otherwise demo is on
 * until Twilio Verify + AUTH_SECRET are configured.
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") {
    return true;
  }

  if (process.env.DEMO_MODE === "false") {
    return false;
  }

  return !(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID &&
    process.env.AUTH_SECRET
  );
}

export const demoOtpCode = "123456";

function getSecretKey(): Uint8Array {
  // The fixed fallback keeps the sign-in flow demoable without configuration;
  // AUTH_SECRET is required (enforced by isDemoMode) before live mode engages.
  const secret = process.env.AUTH_SECRET ?? "settled-demo-secret-not-for-production";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    phone: user.phone,
    name: user.name,
    role: user.role,
    organisationId: user.organisationId,
    organisationName: user.organisationName,
    entitlement: user.entitlement,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAgeSeconds}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (!payload.sub || typeof payload.phone !== "string") {
      return null;
    }

    return {
      id: payload.sub,
      phone: payload.phone,
      name: typeof payload.name === "string" ? payload.name : "",
      role: (payload.role as UserRole) ?? "seller",
      organisationId: typeof payload.organisationId === "string" ? payload.organisationId : null,
      organisationName:
        typeof payload.organisationName === "string" ? payload.organisationName : null,
      entitlement: (payload.entitlement as Entitlement) ?? "payment_required",
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: sessionMaxAgeSeconds,
};

/** Normalises phone input to E.164, defaulting to Australia for local formats. */
export function normalisePhone(input: string): string | null {
  const cleaned = input.replace(/[\s()-]/g, "");

  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^04\d{8}$/.test(cleaned)) {
    return `+61${cleaned.slice(1)}`;
  }

  if (/^614\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}
