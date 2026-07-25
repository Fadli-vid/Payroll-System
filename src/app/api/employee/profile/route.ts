import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { successResponse, errorResponse } from "@/src/utils/api-response";

/**
 * GET /api/employee/profile
 * Fetch full profile details for the logged-in employee (Read-only)
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return errorResponse("Sesi karyawan tidak valid", 401);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      include: {
        department: true,
        position: true,
      },
    });

    if (!employee) {
      return errorResponse("Data karyawan tidak ditemukan", 404);
    }

    return successResponse({
      ...employee,
      baseSalary: Number(employee.baseSalary),
      position: {
        ...employee.position,
        baseAllowance: Number(employee.position.baseAllowance),
      },
    });
  } catch (error) {
    console.error("GET /api/employee/profile error:", error);
    return errorResponse("Gagal mengambil profil karyawan");
  }
}
