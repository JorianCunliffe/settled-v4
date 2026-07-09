import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, sessionCookieName, verifySessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  const user = token ? await verifySessionToken(token) : null;

  return NextResponse.json({ user, demo: isDemoMode() });
}
