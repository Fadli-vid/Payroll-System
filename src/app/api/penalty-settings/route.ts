import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { penaltySettingSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

/**
 * GET /api/penalty-settings — list all penalty settings
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || ""; // LATE or ABSENT

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    const data = await prisma.penaltySetting.findMany({
      where,
      orderBy: [{ type: "asc" }, { minMinutes: "asc" }],
    });

    return successResponse(
      data.map((p) => ({
        ...p,
        value: Number(p.value),
      }))
    );
  } catch (error) {
    console.error("GET /api/penalty-settings error:", error);
    return errorResponse("Gagal memuat pengaturan penalti");
  }
}

/**
 * POST /api/penalty-settings — create a new penalty setting
 */
export async function POST(request: NextRequest) {
  try {
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

    const { type, mode, value, minMinutes, maxMinutes, description, isActive } =
      result.data;

    // For LATE type, check overlapping minute ranges
    if (type === "LATE") {
      const existingLate = await prisma.penaltySetting.findMany({
        where: { type: "LATE" },
      });

      for (const existing of existingLate) {
        const eMin = existing.minMinutes;
        const eMax = existing.maxMinutes ?? Infinity;
        const nMin = minMinutes ?? 0;
        const nMax = maxMinutes ?? Infinity;

        if (nMin <= eMax && nMax >= eMin) {
          return errorResponse(
            `Range menit (${nMin}-${nMax === Infinity ? "∞" : nMax}) bertabrakan dengan pengaturan yang sudah ada (${eMin}-${eMax === Infinity ? "∞" : eMax})`,
            409
          );
        }
      }
    }

    const penalty = await prisma.penaltySetting.create({
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

    return successResponse(
      { ...penalty, value: Number(penalty.value) },
      201
    );
  } catch (error) {
    console.error("POST /api/penalty-settings error:", error);
    return errorResponse("Gagal membuat pengaturan penalti");
  }
}
