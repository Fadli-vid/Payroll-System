import { NextRequest } from "next/server";
import {
  verifyAdminCredentials,
  verifyEmployeeCredentials,
  createSessionToken,
  COOKIE_NAME,
} from "@/src/lib/auth";
import { successResponse, errorResponse } from "@/src/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, password } = body || {};
    const identityInput = String(id || email || "").trim();
    const passwordInput = String(password || "");

    if (!identityInput || !passwordInput) {
      return errorResponse("Email/ID dan Password wajib diisi", 400);
    }

    // 1. Try Admin Login first
    if (verifyAdminCredentials(identityInput, passwordInput)) {
      const token = createSessionToken({
        id: "payrolladmin",
        role: "ADMIN",
        fullName: "Administrator",
        email: "admin@payroll.com",
      });

      const response = successResponse({
        user: {
          id: "payrolladmin",
          name: "Administrator",
          email: "admin@payroll.com",
          role: "ADMIN",
        },
      });

      response.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    // 2. Try Employee Login by email and plain text password
    const employee = await verifyEmployeeCredentials(identityInput, passwordInput);
    if (employee) {
      const token = createSessionToken({
        id: employee.id,
        role: "EMPLOYEE",
        employeeId: employee.id,
        fullName: employee.fullName,
        email: employee.email,
      });

      const response = successResponse({
        user: {
          id: employee.id,
          name: employee.fullName,
          email: employee.email,
          role: "EMPLOYEE",
        },
      });

      response.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    return errorResponse("Email/ID atau Password salah", 401);
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return errorResponse("Terjadi kesalahan saat login");
  }
}
