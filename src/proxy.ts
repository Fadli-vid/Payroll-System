import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, parseSessionToken } from "@/src/lib/session";

// Static asset extensions only — must never match /api/* paths.
const STATIC_ASSET =
  /\.(?:ico|png|jpe?g|svg|gif|webp|avif|css|js|map|txt|xml|json|woff2?|ttf|otf)$/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = parseSessionToken(token);
  const authenticated = user !== null;

  // Allow static assets and Next.js internal requests
  if (
    pathname.startsWith("/_next") ||
    (!pathname.startsWith("/api/") && STATIC_ASSET.test(pathname))
  ) {
    return NextResponse.next();
  }

  // Allow public auth API endpoints (/api/auth/login, /api/auth/logout, etc.)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // If trying to access login page while authenticated
  if (pathname === "/login") {
    if (authenticated) {
      if (user.role === "EMPLOYEE") {
        return NextResponse.redirect(new URL("/employee/attendance", request.url));
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If unauthenticated user tries to access any protected API or Page
  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Akses tidak diizinkan. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC checks for authenticated EMPLOYEE role
  if (user.role === "EMPLOYEE") {
    // If employee hits root dashboard `/`
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/employee/attendance", request.url));
    }

    // Protect Admin API endpoints from Employees
    const adminApiPrefixes = [
      "/api/employees",
      "/api/departments",
      "/api/positions",
      "/api/allowances",
      "/api/deductions",
      "/api/penalty-settings",
      "/api/attendance",
      "/api/payroll",
      "/api/reports",
      "/api/dashboard",
    ];
    if (adminApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Fitur ini hanya untuk Admin." },
        { status: 403 }
      );
    }

    // Protect Admin Pages from Employees (Redirect to /employee/attendance)
    const adminPagePrefixes = [
      "/employees",
      "/departments",
      "/positions",
      "/allowances",
      "/deductions",
      "/attendance",
      "/payroll",
      "/reports",
    ];
    if (adminPagePrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.redirect(new URL("/employee/attendance", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
