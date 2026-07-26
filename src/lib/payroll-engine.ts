import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@/src/generated/prisma/client";
import type { PenaltySetting, Attendance } from "@/src/generated/prisma/client";
import {
  MONTHLY_WORK_HOURS_DIVISOR,
  DEFAULT_WORKING_DAYS_PER_MONTH,
  OVERTIME_MULTIPLIER,
} from "@/src/lib/constants";

export interface PayrollCalculationOptions {
  month: number;
  year: number;
  bonus?: number;
  // Batch optimization caches (prevents N+1 database queries)
  cachedEmployee?: EmployeeWithRelations;
  // Berisi SEMUA aturan penalti (aktif & nonaktif), diurutkan minMinutes asc.
  // Engine memfilter isActive sendiri (dibutuhkan untuk keputusan fallback).
  cachedPenaltySettings?: PenaltySetting[];
  cachedAttendances?: Attendance[];
}

type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
  include: {
    position: true;
    department: true;
    employeeAllowances: { include: { allowance: true } };
    employeeDeductions: { include: { deduction: true } };
  };
  omit: { password: true };
}>;

export interface PayrollCalculationResult {
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowanceTotal: number;
  deductionTotal: number;
  overtimePay: number;
  bonus: number;
  netSalary: number;
  details: {
    component: string;
    type: "EARNING" | "DEDUCTION";
    amount: number;
    description?: string;
  }[];
}

/**
 * Calculate payroll figures and detail items for a single employee in a given month and year.
 *
 * Tunjangan & potongan dihitung HANYA dari assignment junction table
 * (EmployeeAllowance / EmployeeDeduction) dengan master yang masih aktif —
 * karyawan baru otomatis ter-link ke semua master aktif saat dibuat, tetapi
 * un-assign per karyawan kini benar-benar berpengaruh.
 *
 * Supports batch optimization via cached data options to avoid N+1 database queries.
 */
export async function calculateSingleEmployeePayroll(
  employeeId: string,
  options: PayrollCalculationOptions
): Promise<PayrollCalculationResult | null> {
  const { month, year, bonus = 0 } = options;

  // 1. Fetch employee details with position & assigned allowances/deductions (or use batch cache)
  const employee =
    options.cachedEmployee ??
    (await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        department: true,
        employeeAllowances: {
          include: {
            allowance: true,
          },
        },
        employeeDeductions: {
          include: {
            deduction: true,
          },
        },
      },
    }));

  if (!employee || employee.status !== "ACTIVE") {
    return null;
  }

  const basicSalary = Math.round(Number(employee.baseSalary));
  const hourlyRate = basicSalary / MONTHLY_WORK_HOURS_DIVISOR;

  const details: {
    component: string;
    type: "EARNING" | "DEDUCTION";
    amount: number;
    description?: string;
  }[] = [];

  // Base salary line item
  details.push({
    component: "Gaji Pokok",
    type: "EARNING",
    amount: basicSalary,
    description: `Gaji pokok posisi ${employee.position.name}`,
  });

  // 2. Allowances — position base allowance + assigned active allowances
  const appliedAllowanceIds = new Set<string>();
  let allowanceTotal = 0;

  // 2a. Position Base Allowance
  const positionAllowance = Math.round(Number(employee.position.baseAllowance));
  if (positionAllowance > 0) {
    allowanceTotal += positionAllowance;
    details.push({
      component: `Tunjangan Jabatan (${employee.position.name})`,
      type: "EARNING",
      amount: positionAllowance,
      description: "Tunjangan dasar jabatan",
    });
  }

  // 2b. Assigned Allowances (junction table; only active masters apply)
  for (const ea of employee.employeeAllowances) {
    const allowance = ea.allowance;
    if (!allowance || !allowance.isActive || appliedAllowanceIds.has(allowance.id)) {
      continue;
    }
    appliedAllowanceIds.add(allowance.id);
    const rawVal = Number(allowance.amount);
    const amt =
      allowance.type === "PERCENTAGE"
        ? Math.round(basicSalary * (rawVal / 100))
        : Math.round(rawVal);
    allowanceTotal += amt;
    details.push({
      component: allowance.name,
      type: "EARNING",
      amount: amt,
      description:
        allowance.description ||
        (allowance.type === "PERCENTAGE"
          ? `Tunjangan ${rawVal}% dari gaji pokok`
          : "Tunjangan rutin"),
    });
  }

  // 3. Deductions — assigned active deductions (junction table)
  const appliedDeductionIds = new Set<string>();
  let deductionTotal = 0;

  for (const ed of employee.employeeDeductions) {
    const deduction = ed.deduction;
    if (!deduction || !deduction.isActive || appliedDeductionIds.has(deduction.id)) {
      continue;
    }
    appliedDeductionIds.add(deduction.id);
    const rawVal = Number(deduction.amount);
    const amt =
      deduction.type === "PERCENTAGE"
        ? Math.round(basicSalary * (rawVal / 100))
        : Math.round(rawVal);
    deductionTotal += amt;
    details.push({
      component: deduction.name,
      type: "DEDUCTION",
      amount: amt,
      description:
        deduction.description ||
        (deduction.type === "PERCENTAGE"
          ? `Potongan ${rawVal}% dari gaji pokok`
          : "Potongan rutin"),
    });
  }

  // 4. Attendance calculations for month/year (use batch cache if provided)
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const attendances: Attendance[] =
    options.cachedAttendances ??
    (await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    }));

  let totalOvertimeHours = 0;
  let totalLateMinutes = 0;
  let absentDays = 0;

  for (const att of attendances) {
    // Lembur & keterlambatan hanya dihitung untuk hari benar-benar bekerja —
    // record SICK/LEAVE/VACATION/ABSENT tidak menghasilkan lembur/denda telat.
    if (att.status === "PRESENT" || att.status === "LATE") {
      totalOvertimeHours += Number(att.overtimeHours || 0);
      totalLateMinutes += att.lateMinutes || 0;
    }
    if (att.status === "ABSENT") {
      absentDays += 1;
    }
  }

  // Overtime Pay Calculation (flat multiplier — see constants for limitation note)
  const overtimePay = Math.round(
    totalOvertimeHours * hourlyRate * OVERTIME_MULTIPLIER
  );
  if (overtimePay > 0) {
    details.push({
      component: `Uang Lembur (${totalOvertimeHours} jam)`,
      type: "EARNING",
      amount: overtimePay,
      description: `Perhitungan lembur: ${totalOvertimeHours} jam x ${OVERTIME_MULTIPLIER}x tarif per jam`,
    });
  }

  // 5. Configurable Penalty Deductions (use batch cache if provided)
  const penaltySettings: PenaltySetting[] =
    options.cachedPenaltySettings ??
    (await prisma.penaltySetting.findMany({
      orderBy: { minMinutes: "asc" },
    }));

  const lateRulesAll = penaltySettings.filter((p) => p.type === "LATE");
  const absentRulesAll = penaltySettings.filter((p) => p.type === "ABSENT");
  const lateSettings = lateRulesAll.filter((p) => p.isActive);
  const absentSettings = absentRulesAll.filter((p) => p.isActive);

  // 5a. Late Penalty — apply per-record, matching lateMinutes to tier ranges.
  // Label memakai jumlah kejadian/menit yang BENAR-BENAR didenda saja.
  let totalLatePenalty = 0;
  let chargedLateOccurrences = 0;
  let chargedLateMinutes = 0;

  for (const att of attendances) {
    if (att.status !== "LATE" || att.lateMinutes <= 0) continue;
    for (const tier of lateSettings) {
      const min = tier.minMinutes;
      const max = tier.maxMinutes ?? Infinity;
      if (att.lateMinutes >= min && att.lateMinutes <= max) {
        const amt =
          tier.mode === "FIXED"
            ? Math.round(Number(tier.value))
            : Math.round(basicSalary * (Number(tier.value) / 100));
        if (amt > 0) {
          totalLatePenalty += amt;
          chargedLateOccurrences++;
          chargedLateMinutes += att.lateMinutes;
        }
        break; // Only one tier matches per record
      }
    }
  }

  if (totalLatePenalty > 0) {
    deductionTotal += totalLatePenalty;
    details.push({
      component: `Penalti Keterlambatan (${chargedLateOccurrences}x, ${chargedLateMinutes} menit)`,
      type: "DEDUCTION",
      amount: totalLatePenalty,
      description: `Denda keterlambatan ${chargedLateOccurrences} kejadian, total ${chargedLateMinutes} menit`,
    });
  } else if (lateRulesAll.length === 0 && totalLateMinutes > 0) {
    // Fallback legacy hanya bila TIDAK ADA aturan LATE sama sekali di tabel.
    // Aturan ada tapi semua nonaktif = penalti dimatikan secara eksplisit.
    const legacyLatePenalty = Math.round(totalLateMinutes * (hourlyRate / 60));
    if (legacyLatePenalty > 0) {
      deductionTotal += legacyLatePenalty;
      details.push({
        component: `Potongan Keterlambatan (${totalLateMinutes} menit)`,
        type: "DEDUCTION",
        amount: legacyLatePenalty,
        description: `Keterlambatan total ${totalLateMinutes} menit (formula default)`,
      });
    }
  }

  // 5b. Absent Penalty — apply per-day of unexcused absence
  let totalAbsentPenalty = 0;

  if (absentDays > 0 && absentSettings.length > 0) {
    // Use the first active absent setting
    const absentRule = absentSettings[0];
    if (absentRule.mode === "FIXED") {
      totalAbsentPenalty = Math.round(Number(absentRule.value) * absentDays);
    } else {
      // PERCENTAGE of basic salary per day
      totalAbsentPenalty = Math.round(
        basicSalary * (Number(absentRule.value) / 100) * absentDays
      );
    }
  } else if (absentRulesAll.length === 0 && absentDays > 0) {
    // Fallback legacy hanya bila TIDAK ADA aturan ABSENT sama sekali di tabel.
    totalAbsentPenalty = Math.round(
      absentDays * (basicSalary / DEFAULT_WORKING_DAYS_PER_MONTH)
    );
  }

  if (totalAbsentPenalty > 0) {
    deductionTotal += totalAbsentPenalty;
    details.push({
      component: `Penalti Absensi (${absentDays} hari)`,
      type: "DEDUCTION",
      amount: totalAbsentPenalty,
      description: `Tanpa keterangan sebanyak ${absentDays} hari`,
    });
  }

  // Bonus
  const roundedBonus = Math.round(bonus);
  if (roundedBonus > 0) {
    details.push({
      component: "Bonus / Insentif",
      type: "EARNING",
      amount: roundedBonus,
      description: "Bonus / insentif tambahan",
    });
  }

  // Net Salary Calculation — clamped at 0; bila potongan melebihi penerimaan,
  // tambahkan baris penyesuaian agar rincian slip tetap rekonsiliasi dengan net.
  const rawNet =
    basicSalary + allowanceTotal + overtimePay + roundedBonus - deductionTotal;
  const netSalary = Math.max(0, Math.round(rawNet));

  if (rawNet < 0) {
    details.push({
      component: "Penyesuaian Gaji Minimum",
      type: "EARNING",
      amount: Math.round(-rawNet),
      description:
        "Total potongan melebihi total penerimaan; gaji bersih ditetapkan Rp 0 (kelebihan potongan tidak ditagihkan).",
    });
  }

  return {
    employeeId,
    month,
    year,
    basicSalary,
    allowanceTotal,
    deductionTotal,
    overtimePay,
    bonus: roundedBonus,
    netSalary,
    details,
  };
}

/**
 * Save or update a calculated payroll record in the database within a Prisma transaction.
 */
export async function savePayrollRecord(
  calc: PayrollCalculationResult
): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // Check if payroll record already exists for this employee, month, year
    const existing = await tx.payroll.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: calc.employeeId,
          month: calc.month,
          year: calc.year,
        },
      },
    });

    let payrollId: string;

    if (existing) {
      // If approved or paid, throw error to protect finalized payrolls
      if (existing.status === "APPROVED" || existing.status === "PAID") {
        throw new Error(
          `Gaji karyawan untuk bulan ${calc.month}/${calc.year} sudah berstatus ${existing.status} dan tidak dapat di-generate ulang.`
        );
      }

      // Delete old details
      await tx.payrollDetail.deleteMany({
        where: { payrollId: existing.id },
      });

      // Update existing payroll
      const updated = await tx.payroll.update({
        where: { id: existing.id },
        data: {
          basicSalary: calc.basicSalary,
          allowanceTotal: calc.allowanceTotal,
          deductionTotal: calc.deductionTotal,
          overtimePay: calc.overtimePay,
          bonus: calc.bonus,
          netSalary: calc.netSalary,
          status: "DRAFT",
        },
      });
      payrollId = updated.id;
    } else {
      // Create new payroll — race dua proses generate bersamaan ditangkap
      // lewat unique constraint (employeeId, month, year).
      try {
        const created = await tx.payroll.create({
          data: {
            employeeId: calc.employeeId,
            month: calc.month,
            year: calc.year,
            basicSalary: calc.basicSalary,
            allowanceTotal: calc.allowanceTotal,
            deductionTotal: calc.deductionTotal,
            overtimePay: calc.overtimePay,
            bonus: calc.bonus,
            netSalary: calc.netSalary,
            status: "DRAFT",
          },
        });
        payrollId = created.id;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          throw new Error(
            `Gaji ${calc.month}/${calc.year} sedang diproses oleh permintaan lain. Silakan coba lagi.`
          );
        }
        throw e;
      }
    }

    // Insert new payroll details
    if (calc.details.length > 0) {
      await tx.payrollDetail.createMany({
        data: calc.details.map((d) => ({
          payrollId,
          component: d.component,
          type: d.type,
          amount: d.amount,
          description: d.description || null,
        })),
      });
    }

    return payrollId;
  });
}

/**
 * Generate payroll batch for all active employees (or filtered by department) in a target month and year.
 * Highly optimized with bulk data pre-fetching (1 single bulk query set) to prevent N+1 queries.
 */
export async function generateBatchPayroll(
  month: number,
  year: number,
  departmentId?: string,
  bonus?: number
) {
  const whereClause: { status: "ACTIVE"; departmentId?: string } = {
    status: "ACTIVE",
  };
  if (departmentId && departmentId !== "all") {
    whereClause.departmentId = departmentId;
  }

  // 1. Bulk-fetch all active employees with full relations in ONE query
  const activeEmployees = await prisma.employee.findMany({
    where: whereClause,
    include: {
      position: true,
      department: true,
      employeeAllowances: {
        include: {
          allowance: true,
        },
      },
      employeeDeductions: {
        include: {
          deduction: true,
        },
      },
    },
  });

  if (activeEmployees.length === 0) {
    return {
      totalEmployees: 0,
      processedCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }

  // 2. Pre-fetch penalty settings and all attendances for the entire batch concurrently
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const employeeIds = activeEmployees.map((e) => e.id);

  const [penaltySettings, allAttendances] = await Promise.all([
    prisma.penaltySetting.findMany({
      orderBy: { minMinutes: "asc" },
    }),
    prisma.attendance.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  // Group attendances by employeeId for O(1) in-memory lookup
  const attendanceMap = new Map<string, typeof allAttendances>();
  for (const att of allAttendances) {
    let list = attendanceMap.get(att.employeeId);
    if (!list) {
      list = [];
      attendanceMap.set(att.employeeId, list);
    }
    list.push(att);
  }

  let processedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const emp of activeEmployees) {
    try {
      const calc = await calculateSingleEmployeePayroll(emp.id, {
        month,
        year,
        bonus: bonus || 0,
        cachedEmployee: emp,
        cachedPenaltySettings: penaltySettings,
        cachedAttendances: attendanceMap.get(emp.id) || [],
      });

      if (calc) {
        await savePayrollRecord(calc);
        processedCount++;
      } else {
        skippedCount++;
      }
    } catch (err: unknown) {
      skippedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${emp.fullName}: ${msg}`);
    }
  }

  return {
    totalEmployees: activeEmployees.length,
    processedCount,
    skippedCount,
    errors,
  };
}
