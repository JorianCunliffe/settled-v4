import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, sessionCookieName, verifySessionToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  // Demo mode keeps every page open, exactly like the original demo.
  if (isDemoMode()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookieName)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/signin";
    signIn.search = "";
    signIn.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  if (request.nextUrl.pathname.startsWith("/admin") && user.role !== "admin") {
    const home = request.nextUrl.clone();
    home.pathname = "/sell";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sell", "/admin/:path*"],
};
