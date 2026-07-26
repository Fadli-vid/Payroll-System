import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { periodSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
} from "@/src/utils/api-response";

/**
 * GET /api/reports/payroll?month=&year=
 *
 * Angka uang (total gaji, tunjangan, potongan, dsb.) hanya menghitung payroll
 * berstatus APPROVED/PAID — DRAFT dilaporkan sebagai jumlah terpisah.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const parsed = periodSchema.safeParse({
      month: searchParams.get("month") ?? now.getMonth() + 1,
      year: searchParams.get("year") ?? now.getFullYear(),
    });
    if (!parsed.success) {
      return validationErrorResponse(zodFieldErrors(parsed.error));
    }
    const { month, year } = parsed.data;

    const FINAL_STATUSES = ["APPROVED", "PAID"] as const;

    const [statusGroups, finalizedSums, finalized] = await Promise.all([
      prisma.payroll.groupBy({
        by: ["status"],
        where: { month, year },
        _count: true,
      }),
      prisma.payroll.aggregate({
        where: { month, year, status: { in: [...FINAL_STATUSES] } },
        _sum: {
          basicSalary: true,
          allowanceTotal: true,
          deductionTotal: true,
          overtimePay: true,
          bonus: true,
          netSalary: true,
        },
      }),
      prisma.payroll.findMany({
        where: { month, year, status: { in: [...FINAL_STATUSES] } },
        select: {
          netSalary: true,
          allowanceTotal: true,
          deductionTotal: true,
          employee: {
            select: {
              departmentId: true,
              department: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    let draftCount = 0;
    let approvedCount = 0;
    let paidCount = 0;
    for (const g of statusGroups) {
      if (g.status === "DRAFT") draftCount = g._count;
      if (g.status === "APPROVED") approvedCount = g._count;
      if (g.status === "PAID") paidCount = g._count;
    }

    // Department breakdown (finalized only — konsisten dengan angka uang)
    const deptMap = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        employeeCount: number;
        totalNetSalary: number;
        totalAllowance: number;
        totalDeduction: number;
      }
    >();

    for (const p of finalized) {
      const deptId = p.employee.departmentId;
      const deptName = p.employee.department?.name || "Lainnya";

      let deptStat = deptMap.get(deptId);
      if (!deptStat) {
        deptStat = {
          departmentId: deptId,
          departmentName: deptName,
          employeeCount: 0,
          totalNetSalary: 0,
          totalAllowance: 0,
          totalDeduction: 0,
        };
        deptMap.set(deptId, deptStat);
      }

      deptStat.employeeCount += 1;
      deptStat.totalNetSalary += Number(p.netSalary);
      deptStat.totalAllowance += Number(p.allowanceTotal);
      deptStat.totalDeduction += Number(p.deductionTotal);
    }

    const reportSummary = {
      month,
      year,
      totalEmployees: draftCount + approvedCount + paidCount,
      totalBasicSalary: Number(finalizedSums._sum.basicSalary ?? 0),
      totalAllowance: Number(finalizedSums._sum.allowanceTotal ?? 0),
      totalDeduction: Number(finalizedSums._sum.deductionTotal ?? 0),
      totalOvertimePay: Number(finalizedSums._sum.overtimePay ?? 0),
      totalBonus: Number(finalizedSums._sum.bonus ?? 0),
      totalNetSalary: Number(finalizedSums._sum.netSalary ?? 0),
      draftCount,
      approvedCount,
      paidCount,
      departmentBreakdown: Array.from(deptMap.values()),
    };

    return successResponse(reportSummary);
  } catch (error) {
    console.error("GET /api/reports/payroll error:", error);
    return errorResponse("Gagal mengambil laporan penggajian", 500);
  }
}
