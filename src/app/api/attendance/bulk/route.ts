import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { attendanceBulkSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
} from "@/src/utils/api-response";
import {
  calculateAttendanceMetrics,
  toUtcDateTime,
} from "@/src/lib/attendance";

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
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const result = attendanceBulkSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(zodFieldErrors(result.error));
    }

    const { date, entries } = result.data;
    const targetDate = new Date(date);
    const errors: string[] = [];

    // Dedupe entries per employee (entri pertama menang)
    const dedupedMap = new Map<string, (typeof entries)[number]>();
    for (const entry of entries) {
      if (dedupedMap.has(entry.employeeId)) {
        errors.push(`Entri duplikat untuk karyawan ${entry.employeeId} diabaikan`);
      } else {
        dedupedMap.set(entry.employeeId, entry);
      }
    }
    const deduped = [...dedupedMap.values()];
    const employeeIds = deduped.map((e) => e.employeeId);

    // Validasi eksistensi karyawan dalam 1 query
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, fullName: true },
    });
    const employeeNames = new Map(employees.map((e) => [e.id, e.fullName]));
    const unknownIds = employeeIds.filter((id) => !employeeNames.has(id));
    if (unknownIds.length > 0) {
      return validationErrorResponse(
        { entries: [`Karyawan tidak ditemukan: ${unknownIds.join(", ")}`] },
        "Sebagian karyawan tidak ditemukan"
      );
    }

    // Karyawan yang payroll periode ini sudah APPROVED/PAID dikunci
    const lockedRows = await prisma.payroll.findMany({
      where: {
        employeeId: { in: employeeIds },
        month: targetDate.getUTCMonth() + 1,
        year: targetDate.getUTCFullYear(),
        status: { in: ["APPROVED", "PAID"] },
      },
      select: { employeeId: true, status: true },
    });
    const lockedSet = new Set(lockedRows.map((r) => r.employeeId));

    const data = [];
    let lockedCount = 0;
    for (const entry of deduped) {
      if (lockedSet.has(entry.employeeId)) {
        lockedCount++;
        errors.push(
          `${employeeNames.get(entry.employeeId)}: gaji periode ini sudah final, kehadiran terkunci`
        );
        continue;
      }

      const checkIn = entry.checkIn || null;
      const checkOut = entry.checkOut || null;
      const metrics = calculateAttendanceMetrics(checkIn, checkOut);

      let finalStatus = entry.status || "PRESENT";
      if (
        metrics.autoStatus &&
        (finalStatus === "PRESENT" || finalStatus === "LATE")
      ) {
        finalStatus = metrics.autoStatus as typeof finalStatus;
      }

      data.push({
        employeeId: entry.employeeId,
        date: targetDate,
        status: finalStatus,
        checkIn: toUtcDateTime(date, checkIn),
        checkOut: toUtcDateTime(date, checkOut),
        lateMinutes: metrics.lateMinutes,
        overtimeHours: metrics.overtimeHours,
        workingHours: metrics.workingHours,
        notes: entry.notes || null,
      });
    }

    // Satu createMany atomik; duplikat (sudah ada record tanggal ini) dilewati
    // oleh constraint @@unique([employeeId, date]).
    const createResult =
      data.length > 0
        ? await prisma.attendance.createMany({ data, skipDuplicates: true })
        : { count: 0 };

    const created = createResult.count;
    const skipped = deduped.length - created;

    return successResponse(
      {
        created,
        skipped,
        locked: lockedCount,
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
