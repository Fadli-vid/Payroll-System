import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import {
  successResponse,
  errorResponse,
  parseListParams,
} from "@/src/utils/api-response";
import type { Prisma } from "@/src/generated/prisma/client";

const PAYROLL_STATUSES = ["DRAFT", "APPROVED", "PAID"] as const;
type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

function parsePeriodParam(
  raw: string | null,
  min: number,
  max: number
): number | undefined | null {
  if (!raw) return undefined;
  const value = parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const { page, pageSize, search, skip } = parseListParams(url);
    const { searchParams } = url;

    const month = parsePeriodParam(searchParams.get("month"), 1, 12);
    const year = parsePeriodParam(searchParams.get("year"), 2000, 2100);
    if (month === null || year === null) {
      return errorResponse("Parameter bulan/tahun tidak valid", 422);
    }

    const departmentId = searchParams.get("departmentId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const status = PAYROLL_STATUSES.includes(statusParam as PayrollStatus)
      ? (statusParam as PayrollStatus)
      : undefined;

    const where: Prisma.PayrollWhereInput = {};

    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status;

    const employeeFilter: Prisma.EmployeeWhereInput = {};
    if (departmentId && departmentId !== "all") {
      employeeFilter.departmentId = departmentId;
    }
    if (search) {
      employeeFilter.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }
    if (Object.keys(employeeFilter).length > 0) {
      where.employee = employeeFilter;
    }

    const [total, payrolls] = await Promise.all([
      prisma.payroll.count({ where }),
      prisma.payroll.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
        include: {
          employee: {
            select: {
              id: true,
              code: true,
              fullName: true,
              email: true,
              department: { select: { id: true, name: true } },
              position: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const stats = await prisma.payroll.aggregate({
      where,
      _sum: {
        basicSalary: true,
        allowanceTotal: true,
        deductionTotal: true,
        overtimePay: true,
        bonus: true,
        netSalary: true,
      },
    });

    const formattedPayrolls = payrolls.map((p) => ({
      ...p,
      basicSalary: Number(p.basicSalary),
      allowanceTotal: Number(p.allowanceTotal),
      deductionTotal: Number(p.deductionTotal),
      overtimePay: Number(p.overtimePay),
      bonus: Number(p.bonus),
      netSalary: Number(p.netSalary),
    }));

    const totalPages = Math.ceil(total / pageSize);

    return successResponse({
      data: formattedPayrolls,
      summary: {
        totalBasicSalary: Number(stats._sum.basicSalary || 0),
        totalAllowance: Number(stats._sum.allowanceTotal || 0),
        totalDeduction: Number(stats._sum.deductionTotal || 0),
        totalOvertimePay: Number(stats._sum.overtimePay || 0),
        totalBonus: Number(stats._sum.bonus || 0),
        totalNetSalary: Number(stats._sum.netSalary || 0),
      },
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/payroll error:", error);
    return errorResponse("Gagal mengambil data penggajian", 500);
  }
}
