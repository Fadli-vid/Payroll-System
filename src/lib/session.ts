import { createHmac, timingSafeEqual } from "node:crypto";

// Modul sesi bebas-dependensi (tanpa prisma) agar aman diimpor dari proxy/middleware.

export const COOKIE_NAME = "payroll_session";

export interface UserSession {
  id: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId?: string;
  fullName: string;
  email: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET wajib di-set (minimal 32 karakter) di production."
      );
    }
    console.warn(
      "[auth] SESSION_SECRET belum di-set — memakai secret dev yang TIDAK aman."
    );
    return "dev-only-insecure-secret-do-not-use";
  }
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

/**
 * Create an HMAC-SHA256 signed session token.
 */
export function createSessionToken(
  data: Omit<UserSession, "exp">
): string {
  const payload: UserSession = {
    ...data,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${base64Payload}.${sign(base64Payload)}`;
}

/**
 * Parse and verify a session token; returns the payload only when the
 * signature matches (constant-time) and the token has not expired.
 */
export function parseSessionToken(token: string | undefined): UserSession | null {
  if (!token) return null;
  try {
    const [base64Payload, signature] = token.split(".");
    if (!base64Payload || !signature) return null;

    const expected = Buffer.from(sign(base64Payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    const payload: UserSession = JSON.parse(
      Buffer.from(base64Payload, "base64url").toString("utf-8")
    );

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify if session token string is valid.
 */
export function isValidSessionToken(token: string | undefined): boolean {
  return parseSessionToken(token) !== null;
}
