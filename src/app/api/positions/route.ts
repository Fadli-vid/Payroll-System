import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { positionSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  parseListParams,
} from "@/src/utils/api-response";

/**
 * GET /api/positions — list positions with search/pagination/sort
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, search, sortBy, sortOrder, skip } =
      parseListParams(url);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    const allowedSortFields = ["name", "baseAllowance", "createdAt", "updatedAt"];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [data, total] = await Promise.all([
      prisma.position.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip,
        take: pageSize,
        include: {
          _count: { select: { employees: true } },
        },
      }),
      prisma.position.count({ where }),
    ]);

    return successResponse({
      data: data.map((p) => ({
        ...p,
        baseAllowance: Number(p.baseAllowance),
        employeeCount: p._count.employees,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/positions error:", error);
    return errorResponse("Gagal memuat data jabatan");
  }
}

/**
 * POST /api/positions — create a new position
 */
export async function POST(request: NextRequest) {
  try {
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

    // Check for duplicate name
    const existing = await prisma.position.findFirst({
      where: { name: { equals: result.data.name, mode: "insensitive" } },
    });

    if (existing) {
      return validationErrorResponse(
        { name: ["Nama jabatan sudah digunakan"] },
        "Jabatan sudah ada"
      );
    }

    const position = await prisma.position.create({
      data: {
        name: result.data.name,
        baseAllowance: result.data.baseAllowance,
        description: result.data.description || null,
      },
    });

    return successResponse(
      { ...position, baseAllowance: Number(position.baseAllowance) },
      201
    );
  } catch (error) {
    console.error("POST /api/positions error:", error);
    return errorResponse("Gagal membuat jabatan");
  }
}
