import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";
import { payrollStatusSchema } from "@/src/types";
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
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
        details: {
          orderBy: [{ type: "asc" }, { component: "asc" }],
        },
      },
    });

    if (!payroll) {
      return errorResponse("Data penggajian tidak ditemukan", 404);
    }

    // Deteksi staleness: DRAFT dianggap basi bila ada data kehadiran periode
    // ini yang berubah setelah payroll terakhir di-generate/diubah.
    // (Best-effort: penghapusan record kehadiran tidak selalu terdeteksi.)
    let isStale = false;
    if (payroll.status === "DRAFT") {
      const startDate = new Date(Date.UTC(payroll.year, payroll.month - 1, 1));
      const endDate = new Date(
        Date.UTC(payroll.year, payroll.month, 0, 23, 59, 59, 999)
      );
      const latest = await prisma.attendance.aggregate({
        where: {
          employeeId: payroll.employeeId,
          date: { gte: startDate, lte: endDate },
        },
        _max: { updatedAt: true },
      });
      isStale =
        !!latest._max.updatedAt && latest._max.updatedAt > payroll.updatedAt;
    }

    const formatted = {
      ...payroll,
      isStale,
      basicSalary: Number(payroll.basicSalary),
      allowanceTotal: Number(payroll.allowanceTotal),
      deductionTotal: Number(payroll.deductionTotal),
      overtimePay: Number(payroll.overtimePay),
      bonus: Number(payroll.bonus),
      netSalary: Number(payroll.netSalary),
      employee: {
        ...payroll.employee,
        baseSalary: Number(payroll.employee.baseSalary),
        position: {
          ...payroll.employee.position,
          baseAllowance: Number(payroll.employee.position.baseAllowance),
        },
      },
      details: payroll.details.map((d) => ({
        ...d,
        amount: Number(d.amount),
      })),
    };

    return successResponse(formatted);
  } catch (error) {
    console.error("GET /api/payroll/[id] error:", error);
    return errorResponse("Gagal mengambil detail slip gaji", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();

    const validated = payrollStatusSchema.safeParse(body);
    if (!validated.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return validationErrorResponse(fieldErrors);
    }

    const existing = await prisma.payroll.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse("Data penggajian tidak ditemukan", 404);
    }

    // State machine transisi status: PAID bersifat final; APPROVED dapat
    // dikembalikan ke DRAFT ("batalkan persetujuan") atau dilanjutkan ke PAID.
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      DRAFT: ["APPROVED"],
      APPROVED: ["PAID", "DRAFT"],
      PAID: [],
    };

    const nextStatus = validated.data.status;
    if (
      existing.status !== nextStatus &&
      !ALLOWED_TRANSITIONS[existing.status]?.includes(nextStatus)
    ) {
      return errorResponse(
        `Perubahan status ${existing.status} → ${nextStatus} tidak diizinkan`,
        409
      );
    }

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(nextStatus === "APPROVED" ? { approvedAt: new Date() } : {}),
        ...(nextStatus === "PAID" ? { paidAt: new Date() } : {}),
        ...(nextStatus === "DRAFT" ? { approvedAt: null, paidAt: null } : {}),
      },
    });

    return successResponse({
      ...updated,
      basicSalary: Number(updated.basicSalary),
      allowanceTotal: Number(updated.allowanceTotal),
      deductionTotal: Number(updated.deductionTotal),
      overtimePay: Number(updated.overtimePay),
      bonus: Number(updated.bonus),
      netSalary: Number(updated.netSalary),
      message: `Status penggajian berhasil diubah menjadi ${updated.status}`,
    });
  } catch (error) {
    console.error("PATCH /api/payroll/[id] error:", error);
    return errorResponse("Gagal memperbarui status penggajian", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await prisma.payroll.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse("Data penggajian tidak ditemukan", 404);
    }

    if (existing.status !== "DRAFT") {
      return errorResponse("Hanya gaji berstatus DRAFT yang dapat dihapus", 400);
    }

    await prisma.payroll.delete({
      where: { id },
    });

    return successResponse(null);
  } catch (error) {
    console.error("DELETE /api/payroll/[id] error:", error);
    return errorResponse("Gagal menghapus data penggajian", 500);
  }
}
