import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import {
  COOKIE_NAME,
  type UserSession,
  createSessionToken,
  parseSessionToken,
  isValidSessionToken,
} from "@/src/lib/session";

// Re-export agar konsumen lama (routes, proxy) tetap satu pintu.
export {
  COOKIE_NAME,
  createSessionToken,
  parseSessionToken,
  isValidSessionToken,
};
export type { UserSession };

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$/;

/**
 * Constant-time string comparison via SHA-256 digest (lengths may differ).
 */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

/**
 * Verify admin credentials against env vars ADMIN_ID + ADMIN_PASSWORD.
 * ID is case-insensitive; password is case-sensitive and compared constant-time.
 */
export function verifyAdminCredentials(idInput: string, passwordInput: string): boolean {
  const adminId = process.env.ADMIN_ID;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminId || !adminPassword) {
    if (process.env.NODE_ENV === "production") {
      console.error("[auth] ADMIN_ID / ADMIN_PASSWORD belum di-set — login admin dinonaktifkan.");
    } else {
      console.warn("[auth] ADMIN_ID / ADMIN_PASSWORD belum di-set — login admin dinonaktifkan.");
    }
    return false;
  }

  const idMatches = idInput.trim().toLowerCase() === adminId.trim().toLowerCase();
  const passwordMatches = safeEqual(passwordInput, adminPassword);

  return idMatches && passwordMatches;
}

/**
 * Verify employee credentials using email or NIK/code.
 * Passwords are stored as bcrypt hashes; legacy plaintext rows are accepted
 * once and transparently upgraded to bcrypt on successful login.
 */
export async function verifyEmployeeCredentials(identityInput: string, passwordInput: string) {
  const normIdentity = identityInput.trim();
  const password = passwordInput.trim();
  if (!normIdentity || !password) return null;

  // Search by Email OR Employee Code/NIK
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { email: { equals: normIdentity, mode: "insensitive" } },
        { code: { equals: normIdentity, mode: "insensitive" } },
      ],
    },
    omit: { password: false },
  });

  if (!employee || !employee.password) return null;

  const stored = employee.password;

  if (BCRYPT_HASH_PATTERN.test(stored)) {
    if (!(await bcrypt.compare(password, stored))) return null;
  } else {
    // Legacy plaintext row: compare directly, then upgrade to bcrypt.
    if (!safeEqual(stored.trim(), password)) return null;
    await prisma.employee.update({
      where: { id: employee.id },
      data: { password: await bcrypt.hash(password, 10) },
    });
  }

  return employee;
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
