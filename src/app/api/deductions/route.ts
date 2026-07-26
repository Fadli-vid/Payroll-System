import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { deductionSchema } from "@/src/types";
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

    const [deductions, total] = await Promise.all([
      prisma.deduction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.deduction.count({ where }),
    ]);

    const formattedDeductions = deductions.map(d => ({
      ...d,
      amount: Number(d.amount)
    }));

    const totalPages = Math.ceil(total / pageSize);

    return successResponse({
      data: formattedDeductions,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/deductions error:", error);
    return errorResponse("Gagal mengambil data potongan", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const validatedData = deductionSchema.safeParse(body);

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
    const existing = await prisma.deduction.findUnique({
      where: { name },
    });

    if (existing) {
      return validationErrorResponse(
        { name: ["Potongan dengan nama ini sudah ada"] },
        "Potongan sudah ada"
      );
    }

    const newDeduction = await prisma.deduction.create({
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
        await prisma.employeeDeduction.createMany({
          data: activeEmployees.map((e) => ({
            employeeId: e.id,
            deductionId: newDeduction.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return successResponse(
      { ...newDeduction, amount: Number(newDeduction.amount) },
      201
    );
  } catch (error) {
    console.error("POST /api/deductions error:", error);
    return errorResponse("Gagal menambahkan potongan", 500);
  }
}
