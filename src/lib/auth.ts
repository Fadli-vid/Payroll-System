import { cookies } from "next/headers";

export const COOKIE_NAME = "payroll_session";

// Admin credentials (Server side only)
const ADMIN_ID = process.env.ADMIN_ID || "payrolladmin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "payrolladmin";

// Simple signature token secret for session verification
const SESSION_SECRET = process.env.SESSION_SECRET || "payroll_system_admin_secret_token_2026";

/**
 * Verify admin credentials securely on the server
 */
export function verifyAdminCredentials(idInput: string, passwordInput: string): boolean {
  return idInput === ADMIN_ID && passwordInput === ADMIN_PASSWORD;
}

/**
 * Create a simple session token
 */
export function createSessionToken(): string {
  const payload = JSON.stringify({
    role: "admin",
    id: ADMIN_ID,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const base64Payload = Buffer.from(payload).toString("base64url");
  const signature = Buffer.from(`${base64Payload}.${SESSION_SECRET}`).toString("base64url");
  return `${base64Payload}.${signature}`;
}

/**
 * Verify a session token string
 */
export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const [base64Payload, signature] = token.split(".");
    if (!base64Payload || !signature) return false;

    const expectedSignature = Buffer.from(`${base64Payload}.${SESSION_SECRET}`).toString("base64url");
    if (signature !== expectedSignature) return false;

    const payloadStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr);

    if (payload.exp && Date.now() > payload.exp) {
      return false;
    }

    return payload.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Check if current user is authenticated via cookies (Server Component / Route Handler)
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}
