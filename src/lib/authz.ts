import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import type { UserSession } from "@/src/lib/session";

export type AuthResult =
  | { ok: true; user: UserSession }
  | { ok: false; response: NextResponse };

/**
 * Require an authenticated session.
 * Usage: const auth = await requireAuth(); if (!auth.ok) return auth.response;
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Akses tidak diizinkan. Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}

/**
 * Require an authenticated ADMIN session.
 * Usage: const auth = await requireAdmin(); if (!auth.ok) return auth.response;
 */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  if (auth.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Akses ditolak. Fitur ini hanya untuk Admin." },
        { status: 403 }
      ),
    };
  }
  return auth;
}
