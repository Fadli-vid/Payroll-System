import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { deductionSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deduction = await prisma.deduction.findUnique({
      where: { id },
    });

    if (!deduction) {
      return errorResponse("Potongan tidak ditemukan", 404);
    }

    return successResponse({
      ...deduction,
      amount: Number(deduction.amount),
    });
  } catch (error) {
    console.error("GET /api/deductions/[id] error:", error);
    return errorResponse("Gagal mengambil data potongan", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if exists
    const existing = await prisma.deduction.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse("Potongan tidak ditemukan", 404);
    }

    // Check duplicate name on other record
    const duplicate = await prisma.deduction.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (duplicate) {
      return errorResponse("Potongan dengan nama ini sudah ada", 409);
    }

    const updated = await prisma.deduction.update({
      where: { id },
      data: {
        name,
        amount,
        description,
        isActive,
      },
    });

    return successResponse({
      ...updated,
      amount: Number(updated.amount),
    });
  } catch (error) {
    console.error("PUT /api/deductions/[id] error:", error);
    return errorResponse("Gagal memperbarui potongan", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if exists
    const existing = await prisma.deduction.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse("Potongan tidak ditemukan", 404);
    }

    await prisma.deduction.delete({
      where: { id },
    });

    return successResponse(null);
  } catch (error) {
    console.error("DELETE /api/deductions/[id] error:", error);
    return errorResponse("Gagal menghapus potongan", 500);
  }
}
