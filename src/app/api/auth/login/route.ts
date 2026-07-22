import { NextRequest } from "next/server";
import { verifyAdminCredentials, createSessionToken, COOKIE_NAME } from "@/src/lib/auth";
import { successResponse, errorResponse } from "@/src/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password } = body || {};

    if (!id || !password) {
      return errorResponse("ID Admin dan Password harus diisi", 400);
    }

    const isValid = verifyAdminCredentials(String(id).trim(), String(password));
    if (!isValid) {
      return errorResponse("ID Admin atau Password salah", 401);
    }

    const token = createSessionToken();

    const response = successResponse({
      user: {
        id: "payrolladmin",
        name: "Administrator",
        role: "admin",
      },
    }, 200);

    // Set HttpOnly Cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return errorResponse("Terjadi kesalahan saat login");
  }
}
