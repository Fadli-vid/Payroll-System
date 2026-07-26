import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { penaltySettingSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/penalty-settings/[id] — get a single penalty setting
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const setting = await prisma.penaltySetting.findUnique({ where: { id } });
    if (!setting) {
      return errorResponse("Pengaturan penalti tidak ditemukan", 404);
    }

    return successResponse({ ...setting, value: Number(setting.value) });
  } catch (error) {
    console.error("GET /api/penalty-settings/[id] error:", error);
    return errorResponse("Gagal memuat pengaturan penalti");
  }
}

/**
 * PUT /api/penalty-settings/[id] — update a penalty setting
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const result = penaltySettingSchema.safeParse(body);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return validationErrorResponse(fieldErrors);
    }

    const existing = await prisma.penaltySetting.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Pengaturan penalti tidak ditemukan", 404);
    }

    const { type, mode, value, minMinutes, maxMinutes, description, isActive } =
      result.data;

    // For LATE type, check overlapping minute ranges (excluding self; hanya antar aturan aktif)
    if (type === "LATE" && isActive) {
      const otherLate = await prisma.penaltySetting.findMany({
        where: { type: "LATE", id: { not: id }, isActive: true },
      });

      for (const other of otherLate) {
        const eMin = other.minMinutes;
        const eMax = other.maxMinutes ?? Infinity;
        const nMin = minMinutes ?? 0;
        const nMax = maxMinutes ?? Infinity;

        if (nMin <= eMax && nMax >= eMin) {
          return errorResponse(
            `Range menit (${nMin}-${nMax === Infinity ? "∞" : nMax}) bertabrakan dengan pengaturan lain (${eMin}-${eMax === Infinity ? "∞" : eMax})`,
            409
          );
        }
      }
    }

    const updated = await prisma.penaltySetting.update({
      where: { id },
      data: {
        type,
        mode,
        value,
        minMinutes: minMinutes ?? 0,
        maxMinutes: maxMinutes ?? null,
        description: description || null,
        isActive,
      },
    });

    return successResponse({ ...updated, value: Number(updated.value) });
  } catch (error) {
    console.error("PUT /api/penalty-settings/[id] error:", error);
    return errorResponse("Gagal memperbarui pengaturan penalti");
  }
}

/**
 * DELETE /api/penalty-settings/[id] — delete a penalty setting
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const existing = await prisma.penaltySetting.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Pengaturan penalti tidak ditemukan", 404);
    }

    await prisma.penaltySetting.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/penalty-settings/[id] error:", error);
    return errorResponse("Gagal menghapus pengaturan penalti");
  }
}
