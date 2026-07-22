import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { attendanceSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";
import { calculateAttendanceMetrics } from "../route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/attendance/[id] — get a single attendance record
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, code: true, fullName: true },
        },
      },
    });

    if (!attendance) {
      return errorResponse("Data kehadiran tidak ditemukan", 404);
    }

    return successResponse({
      ...attendance,
      overtimeHours: Number(attendance.overtimeHours),
      workingHours: Number(attendance.workingHours),
      date: attendance.date.toISOString(),
      checkIn: attendance.checkIn?.toISOString() ?? null,
      checkOut: attendance.checkOut?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("GET /api/attendance/[id] error:", error);
    return errorResponse("Gagal memuat data kehadiran");
  }
}

/**
 * PUT /api/attendance/[id] — update an attendance record
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = attendanceSchema.safeParse(body);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return validationErrorResponse(fieldErrors);
    }

    // Check existence
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Data kehadiran tidak ditemukan", 404);
    }

    // Check duplicate (exclude current)
    const duplicate = await prisma.attendance.findFirst({
      where: {
        employeeId: result.data.employeeId,
        date: new Date(result.data.date),
        NOT: { id },
      },
    });
    if (duplicate) {
      return validationErrorResponse(
        { date: ["Data kehadiran sudah ada untuk tanggal ini"] },
        "Data kehadiran duplikat"
      );
    }

    // Calculate metrics
    const checkIn = result.data.checkIn || null;
    const checkOut = result.data.checkOut || null;
    const metrics = calculateAttendanceMetrics(checkIn, checkOut);

    // Determine final status
    let finalStatus = result.data.status;
    if (metrics.autoStatus && (finalStatus === "PRESENT" || finalStatus === "LATE")) {
      finalStatus = metrics.autoStatus as typeof finalStatus;
    }

    const dateStr = result.data.date;
    const checkInDt = checkIn ? new Date(`${dateStr}T${checkIn}:00`) : null;
    const checkOutDt = checkOut ? new Date(`${dateStr}T${checkOut}:00`) : null;

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        employeeId: result.data.employeeId,
        date: new Date(result.data.date),
        status: finalStatus,
        checkIn: checkInDt,
        checkOut: checkOutDt,
        lateMinutes: metrics.lateMinutes,
        overtimeHours: metrics.overtimeHours,
        workingHours: metrics.workingHours,
        notes: result.data.notes || null,
      },
      include: {
        employee: {
          select: { id: true, code: true, fullName: true },
        },
      },
    });

    return successResponse({
      ...attendance,
      overtimeHours: Number(attendance.overtimeHours),
      workingHours: Number(attendance.workingHours),
      date: attendance.date.toISOString(),
      checkIn: attendance.checkIn?.toISOString() ?? null,
      checkOut: attendance.checkOut?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("PUT /api/attendance/[id] error:", error);
    return errorResponse("Gagal memperbarui data kehadiran");
  }
}

/**
 * DELETE /api/attendance/[id] — delete an attendance record
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Data kehadiran tidak ditemukan", 404);
    }

    await prisma.attendance.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/attendance/[id] error:", error);
    return errorResponse("Gagal menghapus data kehadiran");
  }
}
