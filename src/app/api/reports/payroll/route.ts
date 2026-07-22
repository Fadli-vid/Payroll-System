import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { successResponse, errorResponse } from "@/src/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : new Date().getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();

    const payrolls = await prisma.payroll.findMany({
      where: { month, year },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    let totalEmployees = payrolls.length;
    let totalBasicSalary = 0;
    let totalAllowance = 0;
    let totalDeduction = 0;
    let totalOvertimePay = 0;
    let totalBonus = 0;
    let totalNetSalary = 0;
    let draftCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

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

    for (const p of payrolls) {
      const basic = Number(p.basicSalary);
      const allow = Number(p.allowanceTotal);
      const ded = Number(p.deductionTotal);
      const ot = Number(p.overtimePay);
      const bon = Number(p.bonus);
      const net = Number(p.netSalary);

      totalBasicSalary += basic;
      totalAllowance += allow;
      totalDeduction += ded;
      totalOvertimePay += ot;
      totalBonus += bon;
      totalNetSalary += net;

      if (p.status === "DRAFT") draftCount++;
      if (p.status === "APPROVED") approvedCount++;
      if (p.status === "PAID") paidCount++;

      const deptId = p.employee.departmentId;
      const deptName = p.employee.department?.name || "Lainnya";

      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          employeeCount: 0,
          totalNetSalary: 0,
          totalAllowance: 0,
          totalDeduction: 0,
        });
      }

      const deptStat = deptMap.get(deptId)!;
      deptStat.employeeCount += 1;
      deptStat.totalNetSalary += net;
      deptStat.totalAllowance += allow;
      deptStat.totalDeduction += ded;
    }

    const reportSummary = {
      month,
      year,
      totalEmployees,
      totalBasicSalary,
      totalAllowance,
      totalDeduction,
      totalOvertimePay,
      totalBonus,
      totalNetSalary,
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
