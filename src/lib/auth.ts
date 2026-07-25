import { cookies } from "next/headers";
import { prisma } from "@/src/lib/prisma";

export const COOKIE_NAME = "payroll_session";

// Admin credentials (Server side only)
const ADMIN_ID = process.env.ADMIN_ID || "payrolladmin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "payrolladmin";

// Secret key for signing session tokens
const SESSION_SECRET = process.env.SESSION_SECRET || "payroll_system_admin_secret_token_2026";

export interface UserSession {
  id: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId?: string;
  fullName: string;
  email: string;
  exp: number;
}

/**
 * Verify admin credentials securely on the server
 */
export function verifyAdminCredentials(idInput: string, passwordInput: string): boolean {
  return (
    (idInput === ADMIN_ID || idInput === "admin@payroll.com") &&
    passwordInput === ADMIN_PASSWORD
  );
}

/**
 * Verify employee credentials using email and plain text password
 */
export async function verifyEmployeeCredentials(emailInput: string, passwordInput: string) {
  const employee = await prisma.employee.findFirst({
    where: {
      email: { equals: emailInput, mode: "insensitive" },
      status: "ACTIVE",
    },
  });

  if (!employee) return null;

  // Plain text password comparison (as explicitly requested by user)
  if (employee.password === passwordInput) {
    return employee;
  }

  return null;
}

/**
 * Create a session token with role and identity payload
 */
export function createSessionToken(data: {
  id: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId?: string;
  fullName: string;
  email: string;
}): string {
  const payload: UserSession = {
    ...data,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = Buffer.from(`${base64Payload}.${SESSION_SECRET}`).toString("base64url");
  return `${base64Payload}.${signature}`;
}

/**
 * Parse and decode session payload if valid
 */
export function parseSessionToken(token: string | undefined): UserSession | null {
  if (!token) return null;
  try {
    const [base64Payload, signature] = token.split(".");
    if (!base64Payload || !signature) return null;

    const expectedSignature = Buffer.from(`${base64Payload}.${SESSION_SECRET}`).toString("base64url");
    if (signature !== expectedSignature) return null;

    const payloadStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
    const payload: UserSession = JSON.parse(payloadStr);

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify if session token string is valid
 */
export function isValidSessionToken(token: string | undefined): boolean {
  return parseSessionToken(token) !== null;
}

/**
 * Get current authenticated user session in Server Components or API Routes
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

/**
 * Helper to check authentication
 */
export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
