import { NextRequest } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { successResponse, errorResponse } from "@/src/utils/api-response";

/**
 * GET /api/auth/me
 * Returns current authenticated user session details
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Tidak terautentikasi", 401);
    }

    return successResponse({
      id: user.id,
      role: user.role,
      employeeId: user.employeeId,
      name: user.fullName,
      email: user.email,
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return errorResponse("Gagal mengambil data sesi pengguna");
  }
}
