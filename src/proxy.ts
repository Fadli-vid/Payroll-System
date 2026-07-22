import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidSessionToken } from "@/src/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = isValidSessionToken(token);

  // Allow static assets and Next.js internal requests
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public auth API endpoints (/api/auth/login, /api/auth/logout, etc.)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow seed API endpoint for database migration
  if (pathname === "/api/seed") {
    return NextResponse.next();
  }

  // If trying to access login page
  if (pathname === "/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If unauthenticated user tries to access protected API endpoints
  if (!authenticated && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, message: "Akses tidak diizinkan. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  // If unauthenticated user tries to access protected dashboard pages
  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
