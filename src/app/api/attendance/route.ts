import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { attendanceSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  parseListParams,
} from "@/src/utils/api-response";
import {
  WORKING_HOURS,
  LATE_RULES,
  LATE_ABSENT_THRESHOLD,
} from "@/src/lib/constants";

/**
 * Parse a time string "HH:mm" into total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Calculate attendance metrics from check-in / check-out times.
 */
function calculateAttendanceMetrics(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
) {
  let lateMinutes = 0;
  let workingHours = 0;
  let overtimeHours = 0;
  let autoStatus: string | null = null;

  const startMinutes = timeToMinutes(WORKING_HOURS.START); // 08:00 → 480
  const endMinutes = timeToMinutes(WORKING_HOURS.END); // 17:00 → 1020

  if (checkIn) {
    const checkInMinutes = timeToMinutes(checkIn);
    if (checkInMinutes > startMinutes) {
      lateMinutes = checkInMinutes - startMinutes;
    }

    // Auto-mark absent if late > threshold
    if (lateMinutes > LATE_ABSENT_THRESHOLD) {
      autoStatus = "ABSENT";
    } else if (lateMinutes > 0) {
      autoStatus = "LATE";
    }

    if (checkOut) {
      const checkOutMinutes = timeToMinutes(checkOut);
      const workedMinutes = Math.max(0, checkOutMinutes - checkInMinutes);
      workingHours = Math.round((workedMinutes / 60) * 100) / 100;

      // Overtime: any work beyond the standard end time
      if (checkOutMinutes > endMinutes) {
        const otMinutes = checkOutMinutes - endMinutes;
        overtimeHours = Math.round((otMinutes / 60) * 100) / 100;
      }
    }
  }

  return { lateMinutes, workingHours, overtimeHours, autoStatus };
}

/**
 * Calculate late deduction amount from late minutes.
 */
function calculateLateDeduction(lateMinutes: number): number {
  for (const rule of LATE_RULES) {
    if (lateMinutes >= rule.minMinutes && lateMinutes <= rule.maxMinutes) {
      return rule.deduction;
    }
  }
  return 0;
}

// Export for use in payroll engine
export { calculateAttendanceMetrics, calculateLateDeduction };

/**
 * GET /api/attendance — list attendance records with search/pagination/sort/filter
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, sortBy, sortOrder, skip } = parseListParams(url);

    // Filters
    const employeeId = url.searchParams.get("employeeId") || "";
    const status = url.searchParams.get("status") || "";
    const dateFrom = url.searchParams.get("dateFrom") || "";
    const dateTo = url.searchParams.get("dateTo") || "";
    const search = url.searchParams.get("search")?.trim() || "";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    // Date range filter
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.date = dateFilter;
    }

    // Search by employee name
    if (search) {
      where.employee = {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const allowedSortFields = ["date", "status", "lateMinutes", "workingHours", "createdAt"];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "date";
    const effectiveSortOrder = sortBy ? sortOrder : "desc";

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { [orderField]: effectiveSortOrder },
        skip,
        take: pageSize,
        include: {
          employee: {
            select: { id: true, code: true, fullName: true },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return successResponse({
      data: data.map((a) => ({
        ...a,
        overtimeHours: Number(a.overtimeHours),
        workingHours: Number(a.workingHours),
        date: a.date.toISOString(),
        checkIn: a.checkIn?.toISOString() ?? null,
        checkOut: a.checkOut?.toISOString() ?? null,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return errorResponse("Gagal memuat data kehadiran");
  }
}

/**
 * POST /api/attendance — create a new attendance record
 */
export async function POST(request: NextRequest) {
  try {
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

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: result.data.employeeId },
    });
    if (!employee) {
      return validationErrorResponse({
        employeeId: ["Karyawan tidak ditemukan"],
      });
    }

    // Check duplicate: same employee + same date
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: result.data.employeeId,
        date: new Date(result.data.date),
      },
    });
    if (existing) {
      return validationErrorResponse(
        { date: ["Data kehadiran sudah ada untuk tanggal ini"] },
        "Data kehadiran duplikat"
      );
    }

    // Calculate metrics
    const checkIn = result.data.checkIn || null;
    const checkOut = result.data.checkOut || null;
    const metrics = calculateAttendanceMetrics(checkIn, checkOut);

    // Determine final status: use auto-detected status if check-in is provided,
    // otherwise use the manually selected status
    let finalStatus = result.data.status;
    if (metrics.autoStatus && (finalStatus === "PRESENT" || finalStatus === "LATE")) {
      finalStatus = metrics.autoStatus as typeof finalStatus;
    }

    // Build checkIn/checkOut as full DateTime (date + time)
    const dateStr = result.data.date;
    const checkInDt = checkIn ? new Date(`${dateStr}T${checkIn}:00`) : null;
    const checkOutDt = checkOut ? new Date(`${dateStr}T${checkOut}:00`) : null;

    const attendance = await prisma.attendance.create({
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

    return successResponse(
      {
        ...attendance,
        overtimeHours: Number(attendance.overtimeHours),
        workingHours: Number(attendance.workingHours),
        date: attendance.date.toISOString(),
        checkIn: attendance.checkIn?.toISOString() ?? null,
        checkOut: attendance.checkOut?.toISOString() ?? null,
      },
      201
    );
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return errorResponse("Gagal membuat data kehadiran");
  }
}
