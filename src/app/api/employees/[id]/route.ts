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
} from "@/src/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/employees/[id] — get a single employee with relations
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true, baseAllowance: true } },
        employeeAllowances: {
          include: { allowance: true },
        },
        employeeDeductions: {
          include: { deduction: true },
        },
      },
    });

    if (!employee) {
      return errorResponse("Karyawan tidak ditemukan", 404);
    }

    return successResponse({
      ...employee,
      baseSalary: Number(employee.baseSalary),
      position: {
        ...employee.position,
        baseAllowance: Number(employee.position.baseAllowance),
      },
    });
  } catch (error) {
    console.error("GET /api/employees/[id] error:", error);
    return errorResponse("Gagal memuat data karyawan");
  }
}

/**
 * PUT /api/employees/[id] — update an employee
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const result = employeeSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(zodFieldErrors(result.error));
    }

    // Check existence
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Karyawan tidak ditemukan", 404);
    }

    // Check duplicate code (exclude current)
    const duplicateCode = await prisma.employee.findFirst({
      where: {
        code: { equals: result.data.code, mode: "insensitive" },
        NOT: { id },
      },
    });
    if (duplicateCode) {
      return validationErrorResponse(
        { code: ["Kode karyawan sudah digunakan"] },
        "Kode karyawan duplikat"
      );
    }

    // Check duplicate email (exclude current)
    const duplicateEmail = await prisma.employee.findFirst({
      where: {
        email: { equals: result.data.email, mode: "insensitive" },
        NOT: { id },
      },
    });
    if (duplicateEmail) {
      return validationErrorResponse(
        { email: ["Email sudah digunakan"] },
        "Email duplikat"
      );
    }

    // Verify department & position exist (mirror POST)
    const [department, position] = await Promise.all([
      prisma.department.findUnique({ where: { id: result.data.departmentId } }),
      prisma.position.findUnique({ where: { id: result.data.positionId } }),
    ]);
    if (!department) {
      return validationErrorResponse({ departmentId: ["Departemen tidak ditemukan"] });
    }
    if (!position) {
      return validationErrorResponse({ positionId: ["Jabatan tidak ditemukan"] });
    }

    const data: Record<string, unknown> = {
      code: result.data.code,
      fullName: result.data.fullName,
      email: result.data.email,
      phone: result.data.phone || null,
      address: result.data.address || null,
      hireDate: new Date(result.data.hireDate),
      status: result.data.status,
      baseSalary: result.data.baseSalary,
      departmentId: result.data.departmentId,
      positionId: result.data.positionId,
    };

    // Password hanya diganti bila diisi — kosong berarti pertahankan yang lama.
    if (result.data.password) {
      data.password = await bcrypt.hash(result.data.password, 10);
    }

    const { allowanceIds, deductionIds } = result.data;

    const employee = await prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data,
        include: {
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      });

      // Sinkronkan assignment tunjangan/potongan bila daftar dikirim (full replace).
      if (allowanceIds) {
        await tx.employeeAllowance.deleteMany({ where: { employeeId: id } });
        if (allowanceIds.length > 0) {
          await tx.employeeAllowance.createMany({
            data: allowanceIds.map((allowanceId) => ({
              employeeId: id,
              allowanceId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (deductionIds) {
        await tx.employeeDeduction.deleteMany({ where: { employeeId: id } });
        if (deductionIds.length > 0) {
          await tx.employeeDeduction.createMany({
            data: deductionIds.map((deductionId) => ({
              employeeId: id,
              deductionId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    return successResponse({
      ...employee,
      baseSalary: Number(employee.baseSalary),
    });
  } catch (error) {
    console.error("PUT /api/employees/[id] error:", error);
    return errorResponse("Gagal memperbarui karyawan");
  }
}

/**
 * DELETE /api/employees/[id] — delete an employee
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payrolls: true, attendances: true },
        },
      },
    });

    if (!existing) {
      return errorResponse("Karyawan tidak ditemukan", 404);
    }

    // Prevent deletion if payroll records exist
    if (existing._count.payrolls > 0) {
      return errorResponse(
        `Tidak dapat menghapus karyawan. Masih ada ${existing._count.payrolls} data penggajian terkait.`,
        409
      );
    }

    // Delete related attendance records first, then employee
    await prisma.$transaction([
      prisma.employeeAllowance.deleteMany({ where: { employeeId: id } }),
      prisma.employeeDeduction.deleteMany({ where: { employeeId: id } }),
      prisma.attendance.deleteMany({ where: { employeeId: id } }),
      prisma.employee.delete({ where: { id } }),
    ]);

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/employees/[id] error:", error);
    return errorResponse("Gagal menghapus karyawan");
  }
}
