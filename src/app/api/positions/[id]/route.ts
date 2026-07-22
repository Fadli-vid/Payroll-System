import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { positionSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/positions/[id] — get a single position
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!position) {
      return errorResponse("Jabatan tidak ditemukan", 404);
    }

    return successResponse({
      ...position,
      baseAllowance: Number(position.baseAllowance),
      employeeCount: position._count.employees,
      _count: undefined,
    });
  } catch (error) {
    console.error("GET /api/positions/[id] error:", error);
    return errorResponse("Gagal memuat jabatan");
  }
}

/**
 * PUT /api/positions/[id] — update a position
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = positionSchema.safeParse(body);

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
    const existing = await prisma.position.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Jabatan tidak ditemukan", 404);
    }

    // Check duplicate name (exclude current)
    const duplicate = await prisma.position.findFirst({
      where: {
        name: { equals: result.data.name, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (duplicate) {
      return validationErrorResponse(
        { name: ["Nama jabatan sudah digunakan"] },
        "Jabatan sudah ada"
      );
    }

    const position = await prisma.position.update({
      where: { id },
      data: {
        name: result.data.name,
        baseAllowance: result.data.baseAllowance,
        description: result.data.description || null,
      },
    });

    return successResponse({
      ...position,
      baseAllowance: Number(position.baseAllowance),
    });
  } catch (error) {
    console.error("PUT /api/positions/[id] error:", error);
    return errorResponse("Gagal memperbarui jabatan");
  }
}

/**
 * DELETE /api/positions/[id] — delete a position
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.position.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!existing) {
      return errorResponse("Jabatan tidak ditemukan", 404);
    }

    // Prevent deletion if employees are assigned
    if (existing._count.employees > 0) {
      return errorResponse(
        `Tidak dapat menghapus jabatan. Masih ada ${existing._count.employees} karyawan yang terdaftar.`,
        409
      );
    }

    await prisma.position.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/positions/[id] error:", error);
    return errorResponse("Gagal menghapus jabatan");
  }
}
