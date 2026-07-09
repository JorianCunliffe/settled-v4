import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
