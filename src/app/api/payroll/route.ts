import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { successResponse, errorResponse } from "@/src/utils/api-response";

type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const status = searchParams.get("status") as PayrollStatus | undefined;

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (month) where.month = month;
    if (year) where.year = year;
    if (status && (status as string) !== "ALL") where.status = status;

    if (departmentId && departmentId !== "all") {
      where.employee = {
        departmentId: departmentId,
      };
    }

    if (search) {
      where.employee = {
        ...where.employee,
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ],
      };
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
