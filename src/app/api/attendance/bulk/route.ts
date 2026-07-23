import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  successResponse,
  errorResponse,
} from "@/src/utils/api-response";
import { calculateAttendanceMetrics } from "@/src/app/api/attendance/route";

/**
 * POST /api/attendance/bulk — create attendance records for multiple employees at once
 *
 * Body:
 * {
 *   date: "2026-07-23",
 *   entries: [
 *     { employeeId, checkIn?, checkOut?, status, notes? },
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, entries } = body;

    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return errorResponse("Data tidak valid: tanggal dan daftar kehadiran wajib diisi", 422);
    }

    const targetDate = new Date(date);

    // Find which employees already have attendance for this date
    const existingRecords = await prisma.attendance.findMany({
      where: { date: targetDate },
      select: { employeeId: true },
    });
    const existingSet = new Set(existingRecords.map((r) => r.employeeId));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      const {
        employeeId,
        checkIn,
        checkOut,
        status,
        notes,
      } = entry;

      // Skip if already has attendance for this date
      if (existingSet.has(employeeId)) {
        skipped++;
        continue;
      }

      try {
        // Calculate metrics from check-in/check-out
        const metrics = calculateAttendanceMetrics(
          checkIn || null,
          checkOut || null
        );

        // Determine final status
        let finalStatus = status || "PRESENT";
        if (
          metrics.autoStatus &&
          (finalStatus === "PRESENT" || finalStatus === "LATE")
        ) {
          finalStatus = metrics.autoStatus;
        }

        // Build DateTime objects
        const checkInDt =
          checkIn ? new Date(`${date}T${checkIn}:00`) : null;
        const checkOutDt =
          checkOut ? new Date(`${date}T${checkOut}:00`) : null;

        await prisma.attendance.create({
          data: {
            employeeId,
            date: targetDate,
            status: finalStatus,
            checkIn: checkInDt,
            checkOut: checkOutDt,
            lateMinutes: metrics.lateMinutes,
            overtimeHours: metrics.overtimeHours,
            workingHours: metrics.workingHours,
            notes: notes || null,
          },
        });

        created++;
      } catch (err) {
        errors.push(`Gagal menyimpan untuk karyawan ${employeeId}`);
      }
    }

    return successResponse(
      {
        created,
        skipped,
        total: entries.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      201
    );
  } catch (error) {
    console.error("POST /api/attendance/bulk error:", error);
    return errorResponse("Gagal menyimpan data kehadiran massal");
  }
}
