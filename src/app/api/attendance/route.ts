import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { attendanceSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  parseListParams,
} from "@/src/utils/api-response";
import {
  calculateAttendanceMetrics,
  toUtcDateTime,
} from "@/src/lib/attendance";
import {
  findFinalizedPayroll,
  finalizedPayrollMessage,
} from "@/src/lib/payroll-guard";

/**
 * GET /api/attendance — list attendance records with search/pagination/sort/filter
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

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
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

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

    // Tolak perubahan bila payroll periode ini sudah APPROVED/PAID
    const locked = await findFinalizedPayroll(
      result.data.employeeId,
      new Date(result.data.date)
    );
    if (locked) {
      return errorResponse(
        finalizedPayrollMessage(locked.month, locked.year, locked.status),
        409
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

    // Wall-clock time disimpan UTC-anchored (klien merender dengan getUTC*)
    const dateStr = result.data.date;
    const checkInDt = toUtcDateTime(dateStr, checkIn);
    const checkOutDt = toUtcDateTime(dateStr, checkOut);

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
