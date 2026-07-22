import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { employeeSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/employees/[id] — get a single employee with relations
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
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
    const { id } = await params;
    const body = await request.json();
    const result = employeeSchema.safeParse(body);

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

    const employee = await prisma.employee.update({
      where: { id },
      data: {
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
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
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
