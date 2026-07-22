import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { departmentSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  parseListParams,
} from "@/src/utils/api-response";

/**
 * GET /api/departments — list departments with search/pagination/sort
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, search, sortBy, sortOrder, skip } =
      parseListParams(url);

    // Build where clause
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

    // Allowed sort fields
    const allowedSortFields = ["name", "createdAt", "updatedAt"];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [data, total] = await Promise.all([
      prisma.department.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip,
        take: pageSize,
        include: {
          _count: { select: { employees: true } },
        },
      }),
      prisma.department.count({ where }),
    ]);

    return successResponse({
      data: data.map((d) => ({
        ...d,
        employeeCount: d._count.employees,
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
    console.error("GET /api/departments error:", error);
    return errorResponse("Gagal memuat data departemen");
  }
}

/**
 * POST /api/departments — create a new department
 */
export async function POST(request: NextRequest) {
  try {
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

    // Check for duplicate name
    const existing = await prisma.department.findFirst({
      where: { name: { equals: result.data.name, mode: "insensitive" } },
    });

    if (existing) {
      return validationErrorResponse(
        { name: ["Nama departemen sudah digunakan"] },
        "Departemen sudah ada"
      );
    }

    const department = await prisma.department.create({
      data: {
        name: result.data.name,
        description: result.data.description || null,
      },
    });

    return successResponse(department, 201);
  } catch (error) {
    console.error("POST /api/departments error:", error);
    return errorResponse("Gagal membuat departemen");
  }
}
