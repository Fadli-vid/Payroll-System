import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { allowanceSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  parseListParams,
} from "@/src/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { page, pageSize, search, sortBy, sortOrder, skip } = parseListParams(
      new URL(req.url),
      ["name", "type", "amount", "isActive", "createdAt", "updatedAt"]
    );

    const where = search
      ? {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [allowances, total] = await Promise.all([
      prisma.allowance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.allowance.count({ where }),
    ]);

    const formattedAllowances = allowances.map(a => ({
      ...a,
      amount: Number(a.amount)
    }));

    const totalPages = Math.ceil(total / pageSize);

    return successResponse({
      data: formattedAllowances,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/allowances error:", error);
    return errorResponse("Gagal mengambil data tunjangan", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const validatedData = allowanceSchema.safeParse(body);

    if (!validatedData.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of validatedData.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return validationErrorResponse(fieldErrors);
    }

    const { name, type, amount, description, isActive } = validatedData.data;

    // Check duplicate name
    const existing = await prisma.allowance.findUnique({
      where: { name },
    });

    if (existing) {
      return validationErrorResponse(
        { name: ["Tunjangan dengan nama ini sudah ada"] },
        "Tunjangan sudah ada"
      );
    }

    const newAllowance = await prisma.allowance.create({
      data: {
        name,
        type: type || "FIXED",
        amount,
        description,
        isActive,
      },
    });

    if (isActive) {
      const activeEmployees = await prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      if (activeEmployees.length > 0) {
        await prisma.employeeAllowance.createMany({
          data: activeEmployees.map((e) => ({
            employeeId: e.id,
            allowanceId: newAllowance.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return successResponse(
      { ...newAllowance, amount: Number(newAllowance.amount) },
      201
    );
  } catch (error) {
    console.error("POST /api/allowances error:", error);
    return errorResponse("Gagal menambahkan tunjangan", 500);
  }
}
