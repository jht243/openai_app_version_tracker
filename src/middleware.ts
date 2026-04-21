import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "app_tracker_auth";
const TOKEN_PREFIX = "authenticated:";
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/ingest"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(COOKIE_NAME);
  const decoded = authCookie?.value
    ? Buffer.from(authCookie.value, "base64").toString()
    : "";
  if (!decoded.startsWith(TOKEN_PREFIX)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
