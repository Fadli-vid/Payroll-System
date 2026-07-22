import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { successResponse, errorResponse } from "@/src/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : new Date().getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let sickCount = 0;
    let vacationCount = 0;
    let absentCount = 0;
    let totalLateMinutes = 0;
    let totalOvertimeHours = 0;

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

    for (const a of attendances) {
      if (a.status === "PRESENT") presentCount++;
      if (a.status === "LATE") lateCount++;
      if (a.status === "LEAVE") leaveCount++;
      if (a.status === "SICK") sickCount++;
      if (a.status === "VACATION") vacationCount++;
      if (a.status === "ABSENT") absentCount++;

      const late = a.lateMinutes || 0;
      const ot = Number(a.overtimeHours || 0);

      totalLateMinutes += late;
      totalOvertimeHours += ot;

      const deptId = a.employee.departmentId;
      const deptName = a.employee.department?.name || "Lainnya";

      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          totalRecords: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          totalOvertimeHours: 0,
        });
      }

      const d = deptMap.get(deptId)!;
      d.totalRecords++;
      if (a.status === "PRESENT" || a.status === "LATE") d.presentCount++;
      if (a.status === "LATE") d.lateCount++;
      if (a.status === "ABSENT") d.absentCount++;
      d.totalOvertimeHours += ot;
    }

    const reportSummary = {
      month,
      year,
      totalRecords: attendances.length,
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
