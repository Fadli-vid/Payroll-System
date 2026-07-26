import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { periodSchema } from "@/src/types";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
} from "@/src/utils/api-response";

const approveAllSchema = periodSchema.extend({
  departmentId: z.string().trim().min(1).optional(),
});

// Menyetujui massal seluruh gaji DRAFT pada satu periode (opsional per
// departemen). Hanya transisi DRAFT → APPROVED — slip APPROVED/PAID tidak
// tersentuh, konsisten dengan state machine di /api/payroll/[id].
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const parsed = approveAllSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(zodFieldErrors(parsed.error));
    }

    const { month, year, departmentId } = parsed.data;

    const result = await prisma.payroll.updateMany({
      where: {
        month,
        year,
        status: "DRAFT",
        ...(departmentId ? { employee: { departmentId } } : {}),
      },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    return successResponse({
      approvedCount: result.count,
      message:
        result.count === 0
          ? "Tidak ada gaji berstatus Draf pada periode ini."
          : `${result.count} gaji berhasil disetujui.`,
    });
  } catch (error) {
    console.error("POST /api/payroll/approve-all error:", error);
    return errorResponse("Gagal menyetujui gaji secara massal", 500);
  }
}
