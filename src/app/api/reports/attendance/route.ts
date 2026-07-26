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
 * GET /api/reports/attendance?month=&year=
 *
 * Agregasi dilakukan di database (groupBy) — tidak memuat seluruh baris
 * kehadiran satu bulan ke memori. Total menit telat & jam lembur hanya
 * dihitung dari record PRESENT/LATE (konsisten dengan payroll engine).
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

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const dateRange = { gte: startDate, lte: endDate };

    const [statusGroups, perEmployee] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where: { date: dateRange },
        _count: true,
        _sum: { lateMinutes: true, overtimeHours: true },
      }),
      prisma.attendance.groupBy({
        by: ["employeeId", "status"],
        where: { date: dateRange },
        _count: true,
        _sum: { overtimeHours: true },
      }),
    ]);

    let totalRecords = 0;
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let sickCount = 0;
    let vacationCount = 0;
    let absentCount = 0;
    let totalLateMinutes = 0;
    let totalOvertimeHours = 0;

    for (const g of statusGroups) {
      totalRecords += g._count;
      if (g.status === "PRESENT") presentCount = g._count;
      if (g.status === "LATE") lateCount = g._count;
      if (g.status === "LEAVE") leaveCount = g._count;
      if (g.status === "SICK") sickCount = g._count;
      if (g.status === "VACATION") vacationCount = g._count;
      if (g.status === "ABSENT") absentCount = g._count;

      // Konsisten dengan engine: telat & lembur hanya dari hari kerja nyata
      if (g.status === "PRESENT" || g.status === "LATE") {
        totalLateMinutes += g._sum.lateMinutes ?? 0;
        totalOvertimeHours += Number(g._sum.overtimeHours ?? 0);
      }
    }

    // Department breakdown via employee → department lookup
    const employeeIds = [...new Set(perEmployee.map((g) => g.employeeId))];
    const employees =
      employeeIds.length > 0
        ? await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: {
              id: true,
              departmentId: true,
              department: { select: { name: true } },
            },
          })
        : [];
    const employeeDept = new Map(
      employees.map((e) => [
        e.id,
        { deptId: e.departmentId, deptName: e.department?.name || "Lainnya" },
      ])
    );

    const deptMap = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        totalRecords: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        totalOvertimeHours: number;
      }
    >();

    for (const g of perEmployee) {
      const dept = employeeDept.get(g.employeeId);
      if (!dept) continue;

      let d = deptMap.get(dept.deptId);
      if (!d) {
        d = {
          departmentId: dept.deptId,
          departmentName: dept.deptName,
          totalRecords: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          totalOvertimeHours: 0,
        };
        deptMap.set(dept.deptId, d);
      }

      d.totalRecords += g._count;
      if (g.status === "PRESENT" || g.status === "LATE") {
        d.presentCount += g._count;
        d.totalOvertimeHours += Number(g._sum.overtimeHours ?? 0);
      }
      if (g.status === "LATE") d.lateCount += g._count;
      if (g.status === "ABSENT") d.absentCount += g._count;
    }

    const reportSummary = {
      month,
      year,
      totalRecords,
      presentCount,
      lateCount,
      leaveCount,
      sickCount,
      vacationCount,
      absentCount,
      totalLateMinutes,
      totalOvertimeHours,
      departmentBreakdown: Array.from(deptMap.values()),
    };

    return successResponse(reportSummary);
  } catch (error) {
    console.error("GET /api/reports/attendance error:", error);
    return errorResponse("Gagal mengambil laporan kehadiran", 500);
  }
}
