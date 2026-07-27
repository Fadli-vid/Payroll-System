import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { successResponse, errorResponse } from "@/src/utils/api-response";

/**
 * GET /api/employee/payslips
 * Fetch all approved or paid payslips for the logged-in employee (Read-only)
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return errorResponse("Sesi karyawan tidak valid", 401);
    }

    const payslips = await prisma.payroll.findMany({
      where: {
        employeeId: user.employeeId,
        status: { in: ["APPROVED", "PAID"] },
      },
      include: {
        employee: {
          select: {
            code: true,
            fullName: true,
            email: true,
            bankName: true,
            bankAccount: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
        details: {
          orderBy: { type: "asc" },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return successResponse(
      payslips.map((p) => ({
        ...p,
        basicSalary: Number(p.basicSalary),
        allowanceTotal: Number(p.allowanceTotal),
        deductionTotal: Number(p.deductionTotal),
        overtimePay: Number(p.overtimePay),
        bonus: Number(p.bonus),
        netSalary: Number(p.netSalary),
        details: p.details.map((d) => ({
          ...d,
          amount: Number(d.amount),
        })),
      }))
    );
  } catch (error) {
    console.error("GET /api/employee/payslips error:", error);
    return errorResponse("Gagal mengambil data slip gaji");
  }
}
