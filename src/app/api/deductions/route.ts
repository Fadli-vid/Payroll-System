import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { deductionSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const skip = (page - 1) * pageSize;

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

    const { name, amount, description, isActive } = validatedData.data;

    // Check duplicate name
    const existing = await prisma.deduction.findUnique({
      where: { name },
    });

    if (existing) {
      return errorResponse("Potongan dengan nama ini sudah ada", 409);
    }

    const newDeduction = await prisma.deduction.create({
      data: {
        name,
        amount,
        description,
        isActive,
      },
    });

    return successResponse(
      { ...newDeduction, amount: Number(newDeduction.amount) },
      201
    );
  } catch (error) {
    console.error("POST /api/deductions error:", error);
    return errorResponse("Gagal menambahkan potongan", 500);
  }
}
