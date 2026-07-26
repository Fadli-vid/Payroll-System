import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { periodSchema } from "@/src/types";
import { successResponse, errorResponse } from "@/src/utils/api-response";

/**
 * GET /api/employee/attendance?month=7&year=2026
 * Fetch attendance calendar records for the logged-in employee (Read-only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return errorResponse("Sesi karyawan tidak valid", 401);
    }

    const { searchParams } = new URL(request.url);
    const today = new Date();
    const parsed = periodSchema.safeParse({
      month: searchParams.get("month") ?? today.getMonth() + 1,
      year: searchParams.get("year") ?? today.getFullYear(),
    });
    if (!parsed.success) {
      return errorResponse("Parameter bulan/tahun tidak valid", 422);
    }
    const { month, year } = parsed.data;

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const records = await prisma.attendance.findMany({
      where: {
        employeeId: user.employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Compute monthly attendance summary
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let sickCount = 0;
    let vacationCount = 0;
    let absentCount = 0;
    let totalLateMinutes = 0;
    let totalOvertimeHours = 0;

    for (const r of records) {
      if (r.status === "PRESENT") presentCount++;
      if (r.status === "LATE") {
        lateCount++;
        totalLateMinutes += r.lateMinutes || 0;
      }
      if (r.status === "LEAVE") leaveCount++;
      if (r.status === "SICK") sickCount++;
      if (r.status === "VACATION") vacationCount++;
      if (r.status === "ABSENT") absentCount++;
      // Konsisten dengan payroll engine: lembur hanya dari hari kerja nyata
      if (r.status === "PRESENT" || r.status === "LATE") {
        totalOvertimeHours += Number(r.overtimeHours || 0);
      }
    }

    return successResponse({
      month,
      year,
      records: records.map((r) => ({
        ...r,
        overtimeHours: Number(r.overtimeHours),
        workingHours: Number(r.workingHours),
      })),
      summary: {
        totalRecords: records.length,
        presentCount,
        lateCount,
        leaveCount,
        sickCount,
        vacationCount,
        absentCount,
        totalLateMinutes,
        totalOvertimeHours,
      },
    });
  } catch (error) {
    console.error("GET /api/employee/attendance error:", error);
    return errorResponse("Gagal mengambil data kehadiran karyawan");
  }
}
