import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { employeeSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
  parseListParams,
} from "@/src/utils/api-response";

// Password awal untuk karyawan baru bila admin tidak mengisi password.
const DEFAULT_INITIAL_PASSWORD = "123456";

/**
 * GET /api/employees — list employees with search/pagination/sort/filter
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const { page, pageSize, search, sortBy, sortOrder, skip } =
      parseListParams(url);

    // Optional filters
    const status = url.searchParams.get("status") || "";
    const departmentId = url.searchParams.get("departmentId") || "";
    const positionId = url.searchParams.get("positionId") || "";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (positionId) where.positionId = positionId;

    // Allowed sort fields
    const allowedSortFields = [
      "code",
      "fullName",
      "email",
      "status",
      "baseSalary",
      "hireDate",
      "createdAt",
    ];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip,
        take: pageSize,
        include: {
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return successResponse({
      data: data.map((e) => ({
        ...e,
        baseSalary: Number(e.baseSalary),
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return errorResponse("Gagal memuat data karyawan");
  }
}

/**
 * POST /api/employees — create a new employee
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const result = employeeSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(zodFieldErrors(result.error));
    }

    // Check for duplicate code
    const existingCode = await prisma.employee.findFirst({
      where: { code: { equals: result.data.code, mode: "insensitive" } },
    });
    if (existingCode) {
      return validationErrorResponse(
        { code: ["Kode karyawan sudah digunakan"] },
        "Kode karyawan duplikat"
      );
    }

    // Check for duplicate email
    const existingEmail = await prisma.employee.findFirst({
      where: { email: { equals: result.data.email, mode: "insensitive" } },
    });
    if (existingEmail) {
      return validationErrorResponse(
        { email: ["Email sudah digunakan"] },
        "Email duplikat"
      );
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: result.data.departmentId },
    });
    if (!department) {
      return validationErrorResponse(
        { departmentId: ["Departemen tidak ditemukan"] }
      );
    }

    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: result.data.positionId },
    });
    if (!position) {
      return validationErrorResponse(
        { positionId: ["Jabatan tidak ditemukan"] }
      );
    }

    const passwordHash = await bcrypt.hash(
      result.data.password || DEFAULT_INITIAL_PASSWORD,
      10
    );

    // Daftar tunjangan/potongan yang di-assign: pakai pilihan eksplisit bila
    // dikirim, selain itu default = semua master aktif (auto-link).
    const [activeDeductions, activeAllowances] = await Promise.all([
      prisma.deduction.findMany({ where: { isActive: true }, select: { id: true } }),
      prisma.allowance.findMany({ where: { isActive: true }, select: { id: true } }),
    ]);
    const activeAllowanceIds = new Set(activeAllowances.map((a) => a.id));
    const activeDeductionIds = new Set(activeDeductions.map((d) => d.id));
    const allowanceIds = result.data.allowanceIds
      ? result.data.allowanceIds.filter((id) => activeAllowanceIds.has(id))
      : [...activeAllowanceIds];
    const deductionIds = result.data.deductionIds
      ? result.data.deductionIds.filter((id) => activeDeductionIds.has(id))
      : [...activeDeductionIds];

    const employee = await prisma.$transaction(async (tx) => {
      const created = await tx.employee.create({
        data: {
          code: result.data.code,
          fullName: result.data.fullName,
          email: result.data.email,
          password: passwordHash,
          phone: result.data.phone || null,
          address: result.data.address || null,
          hireDate: new Date(result.data.hireDate),
          status: result.data.status,
          baseSalary: result.data.baseSalary,
          departmentId: result.data.departmentId,
          positionId: result.data.positionId,
        },
        include: {
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      });

      if (deductionIds.length > 0) {
        await tx.employeeDeduction.createMany({
          data: deductionIds.map((deductionId) => ({
            employeeId: created.id,
            deductionId,
          })),
          skipDuplicates: true,
        });
      }

      if (allowanceIds.length > 0) {
        await tx.employeeAllowance.createMany({
          data: allowanceIds.map((allowanceId) => ({
            employeeId: created.id,
            allowanceId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    return successResponse(
      { ...employee, baseSalary: Number(employee.baseSalary) },
      201
    );
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return errorResponse("Gagal membuat karyawan");
  }
}
