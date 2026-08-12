import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("wtf_token")?.value;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  const protectedPaths =
    pathname.startsWith("/learn") ||
    pathname.startsWith("/progress") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/notifications");

  if (!token && protectedPaths) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/learn", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/learn/:path*",
    "/progress/:path*",
    "/courses/:path*",
    "/profile/:path*",
    "/docs/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/notifications/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
