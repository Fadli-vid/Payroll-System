import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Run core queries
    const [
      totalEmployees,
      activeEmployees,
      totalDepartments,
      totalPositions,
      payrollThisMonth,
      recentEmployees,
      recentPayrolls,
      monthlyPayrollData,
    ] = await Promise.all([
      prisma.employee.count().catch(() => 0),
      prisma.employee.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.department.count().catch(() => 0),
      prisma.position.count().catch(() => 0),
      prisma.payroll
        .aggregate({
          where: { month: currentMonth, year: currentYear },
          _sum: {
            netSalary: true,
            overtimePay: true,
            deductionTotal: true,
            allowanceTotal: true,
          },
          _count: true,
        })
        .catch(() => ({
          _sum: {
            netSalary: 0,
            overtimePay: 0,
            deductionTotal: 0,
            allowanceTotal: 0,
          },
          _count: 0,
        })),
      prisma.employee
        .findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        })
        .catch(() => []),
      prisma.payroll
        .findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            employee: { select: { fullName: true, code: true } },
          },
        })
        .catch(() => []),
      getMonthlyPayrollData(currentMonth, currentYear),
    ]);

    // Status counts for current month
    const payrollStatusCounts = await prisma.payroll
      .groupBy({
        by: ["status"],
        where: { month: currentMonth, year: currentYear },
        _count: true,
      })
      .catch(() => []);

    const statusCounts = {
      DRAFT: 0,
      APPROVED: 0,
      PAID: 0,
    };
    for (const item of payrollStatusCounts) {
      statusCounts[item.status] = item._count;
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          activeEmployees,
          totalDepartments,
          totalPositions,
          payrollThisMonth: Number(payrollThisMonth._sum?.netSalary ?? 0),
          totalOvertime: Number(payrollThisMonth._sum?.overtimePay ?? 0),
          totalDeductions: Number(payrollThisMonth._sum?.deductionTotal ?? 0),
          totalAllowances: Number(payrollThisMonth._sum?.allowanceTotal ?? 0),
          payrollCount: payrollThisMonth._count ?? 0,
        },
        statusCounts,
        recentEmployees: recentEmployees.map((e) => ({
          id: e.id,
          code: e.code,
          fullName: e.fullName,
          email: e.email,
          status: e.status,
          department: e.department?.name || "-",
          position: e.position?.name || "-",
          baseSalary: Number(e.baseSalary || 0),
          hireDate: e.hireDate ? e.hireDate.toISOString() : new Date().toISOString(),
        })),
        recentPayrolls: recentPayrolls.map((p) => ({
          id: p.id,
          employeeName: p.employee?.fullName || "-",
          employeeCode: p.employee?.code || "-",
          month: p.month,
          year: p.year,
          netSalary: Number(p.netSalary || 0),
          status: p.status,
        })),
        monthlyChart: monthlyPayrollData,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data dashboard" },
      { status: 500 }
    );
  }
}

/**
 * Get monthly payroll totals for the last 6 months using 1 groupBy query instead of 6 aggregate queries.
 */
async function getMonthlyPayrollData(currentMonth: number, currentYear: number) {
  const months: { month: number; year: number; label: string }[] = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({ month: m, year: y, label: `${monthNames[m - 1]} ${y}` });
  }

  try {
    const grouped = await prisma.payroll.groupBy({
      by: ["month", "year"],
      _sum: { netSalary: true },
    });

    const resultMap = new Map<string, number>();
    for (const item of grouped) {
      resultMap.set(
        `${item.year}-${item.month}`,
        Number(item._sum.netSalary ?? 0)
      );
    }

    return months.map(({ month, year, label }) => ({
      label,
      total: resultMap.get(`${year}-${month}`) || 0,
    }));
  } catch (err) {
    console.error("Error in getMonthlyPayrollData:", err);
    return months.map(({ label }) => ({ label, total: 0 }));
  }
}
