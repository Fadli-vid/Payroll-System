import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { departmentSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/departments/[id] — get a single department
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!department) {
      return errorResponse("Departemen tidak ditemukan", 404);
    }

    return successResponse({
      ...department,
      employeeCount: department._count.employees,
      _count: undefined,
    });
  } catch (error) {
    console.error("GET /api/departments/[id] error:", error);
    return errorResponse("Gagal memuat departemen");
  }
}

/**
 * PUT /api/departments/[id] — update a department
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = departmentSchema.safeParse(body);

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
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Departemen tidak ditemukan", 404);
    }

    // Check duplicate name (exclude current)
    const duplicate = await prisma.department.findFirst({
      where: {
        name: { equals: result.data.name, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (duplicate) {
      return validationErrorResponse(
        { name: ["Nama departemen sudah digunakan"] },
        "Departemen sudah ada"
      );
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: result.data.name,
        description: result.data.description || null,
      },
    });

    return successResponse(department);
  } catch (error) {
    console.error("PUT /api/departments/[id] error:", error);
    return errorResponse("Gagal memperbarui departemen");
  }
}

/**
 * DELETE /api/departments/[id] — delete a department
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check existence
    const existing = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!existing) {
      return errorResponse("Departemen tidak ditemukan", 404);
    }

    // Prevent deletion if employees are assigned
    if (existing._count.employees > 0) {
      return errorResponse(
        `Tidak dapat menghapus departemen. Masih ada ${existing._count.employees} karyawan yang terdaftar.`,
        409
      );
    }

    await prisma.department.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/departments/[id] error:", error);
    return errorResponse("Gagal menghapus departemen");
  }
}
