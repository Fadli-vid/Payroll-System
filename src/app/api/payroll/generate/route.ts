import { NextRequest } from "next/server";
import { generateBatchPayroll } from "@/src/lib/payroll-engine";
import { payrollGenerateSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/src/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = payrollGenerateSchema.safeParse(body);

    if (!validated.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return validationErrorResponse(fieldErrors);
    }

    const { month, year, departmentId, bonus } = validated.data;

    const result = await generateBatchPayroll(
      month,
      year,
      departmentId || undefined,
      bonus || 0
    );

    return successResponse({
      ...result,
      message: `Proses generate gaji selesai. ${result.processedCount} diproses, ${result.skippedCount} dilewati.`,
    });
  } catch (error) {
    console.error("POST /api/payroll/generate error:", error);
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Gagal memproses pembuatan gaji",
      500
    );
  }
}
