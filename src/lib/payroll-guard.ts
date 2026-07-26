import { prisma } from "@/src/lib/prisma";

/**
 * Returns the APPROVED/PAID payroll covering this employee + date's period,
 * or null when the period is still open for attendance changes.
 */
export async function findFinalizedPayroll(employeeId: string, date: Date) {
  return prisma.payroll.findFirst({
    where: {
      employeeId,
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
      status: { in: ["APPROVED", "PAID"] },
    },
    select: { id: true, status: true, month: true, year: true },
  });
}

export function finalizedPayrollMessage(
  month: number,
  year: number,
  status: string
): string {
  return `Gaji periode ${month}/${year} sudah berstatus ${status}. Data kehadiran periode ini terkunci.`;
}
