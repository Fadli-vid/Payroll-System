import { prisma } from "@/src/lib/prisma";

export interface PayrollCalculationOptions {
  month: number;
  year: number;
  bonus?: number;
}

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
 */
export async function calculateSingleEmployeePayroll(
  employeeId: string,
  options: PayrollCalculationOptions
): Promise<PayrollCalculationResult | null> {
  const { month, year, bonus = 0 } = options;

  // 1. Fetch employee details with position and assigned allowances/deductions
  const employee = await prisma.employee.findUnique({
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
  });

  if (!employee || employee.status !== "ACTIVE") {
    return null;
  }

  const basicSalary = Number(employee.baseSalary);
  const hourlyRate = basicSalary / 173; // Standard hourly rate calculation

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

  // 3. Employee & Active Master Allowances
  const activeMasterAllowances = await prisma.allowance.findMany({
    where: { isActive: true },
  });

  const appliedAllowanceIds = new Set<string>();
  let allowanceTotal = 0;

  // 3a. Position Base Allowance
  const positionAllowance = Number(employee.position.baseAllowance);
  if (positionAllowance > 0) {
    allowanceTotal += positionAllowance;
    details.push({
      component: `Tunjangan Jabatan (${employee.position.name})`,
      type: "EARNING",
      amount: positionAllowance,
      description: "Tunjangan dasar jabatan",
    });
  }

  // 3b. Active Master Allowances
  for (const allowance of activeMasterAllowances) {
    appliedAllowanceIds.add(allowance.id);
    const amt = Number(allowance.amount);
    allowanceTotal += amt;
    details.push({
      component: allowance.name,
      type: "EARNING",
      amount: amt,
      description: allowance.description || "Tunjangan rutin",
    });
  }

  // 3c. Additional Employee-Specific Allowances
  for (const ea of employee.employeeAllowances) {
    if (
      ea.allowance &&
      ea.allowance.isActive &&
      !appliedAllowanceIds.has(ea.allowance.id)
    ) {
      appliedAllowanceIds.add(ea.allowance.id);
      const amt = Number(ea.allowance.amount);
      allowanceTotal += amt;
      details.push({
        component: ea.allowance.name,
        type: "EARNING",
        amount: amt,
        description: ea.allowance.description || "Tunjangan rutin",
      });
    }
  }

  // 4. Employee & Active Master Deductions
  const activeMasterDeductions = await prisma.deduction.findMany({
    where: { isActive: true },
  });

  const appliedDeductionIds = new Set<string>();
  let deductionTotal = 0;

  // 4a. Active Master Deductions
  for (const deduction of activeMasterDeductions) {
    appliedDeductionIds.add(deduction.id);
    const amt = Number(deduction.amount);
    deductionTotal += amt;
    details.push({
      component: deduction.name,
      type: "DEDUCTION",
      amount: amt,
      description: deduction.description || "Potongan rutin",
    });
  }

  // 4b. Additional Employee-Specific Deductions
  for (const ed of employee.employeeDeductions) {
    if (
      ed.deduction &&
      ed.deduction.isActive &&
      !appliedDeductionIds.has(ed.deduction.id)
    ) {
      appliedDeductionIds.add(ed.deduction.id);
      const amt = Number(ed.deduction.amount);
      deductionTotal += amt;
      details.push({
        component: ed.deduction.name,
        type: "DEDUCTION",
        amount: amt,
        description: ed.deduction.description || "Potongan rutin",
      });
    }
  }

  // 5. Attendance calculations for month/year
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  let totalOvertimeHours = 0;
  let totalLateMinutes = 0;
  let absentDays = 0;

  for (const att of attendances) {
    totalOvertimeHours += Number(att.overtimeHours || 0);
    totalLateMinutes += att.lateMinutes || 0;
    if (att.status === "ABSENT") {
      absentDays += 1;
    }
  }

  // Overtime Pay Calculation (1.5x hourly rate)
  const overtimePay = Math.round(totalOvertimeHours * hourlyRate * 1.5);
  if (overtimePay > 0) {
    details.push({
      component: `Uang Lembur (${totalOvertimeHours} jam)`,
      type: "EARNING",
      amount: overtimePay,
      description: `Perhitungan lembur: ${totalOvertimeHours} jam x 1.5x tarif per jam`,
    });
  }

  // 6. Configurable Penalty Deductions (from penalty_settings table)
  const penaltySettings = await prisma.penaltySetting.findMany({
    where: { isActive: true },
    orderBy: { minMinutes: "asc" },
  });

  const lateSettings = penaltySettings.filter((p) => p.type === "LATE");
  const absentSettings = penaltySettings.filter((p) => p.type === "ABSENT");

  // 6a. Late Penalty — apply per-record, matching lateMinutes to tier ranges
  let totalLatePenalty = 0;
  let lateOccurrences = 0;

  for (const att of attendances) {
    if (att.status === "LATE" && att.lateMinutes > 0) {
      lateOccurrences++;
      // Find matching tier
      for (const tier of lateSettings) {
        const min = tier.minMinutes;
        const max = tier.maxMinutes ?? Infinity;
        if (att.lateMinutes >= min && att.lateMinutes <= max) {
          if (tier.mode === "FIXED") {
            totalLatePenalty += Number(tier.value);
          } else {
            // PERCENTAGE of basic salary
            totalLatePenalty += Math.round(
              basicSalary * (Number(tier.value) / 100)
            );
          }
          break; // Only one tier matches per record
        }
      }
    }
  }

  if (totalLatePenalty > 0) {
    deductionTotal += totalLatePenalty;
    details.push({
      component: `Penalti Keterlambatan (${lateOccurrences}x, ${totalLateMinutes} menit)`,
      type: "DEDUCTION",
      amount: totalLatePenalty,
      description: `Denda keterlambatan ${lateOccurrences} kejadian, total ${totalLateMinutes} menit`,
    });
  } else if (lateSettings.length === 0 && totalLateMinutes > 0) {
    // Fallback: no penalty settings configured — use legacy formula
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

  // 6b. Absent Penalty — apply per-day of unexcused absence
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
  } else if (absentSettings.length === 0 && absentDays > 0) {
    // Fallback: no penalty settings configured — use legacy formula
    totalAbsentPenalty = Math.round(absentDays * (basicSalary / 22));
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
  if (bonus > 0) {
    details.push({
      component: "Bonus / Insentif",
      type: "EARNING",
      amount: bonus,
      description: "Bonus / insentif tambahan",
    });
  }

  // Net Salary Calculation
  const netSalary = Math.max(
    0,
    basicSalary + allowanceTotal + overtimePay + bonus - deductionTotal
  );

  return {
    employeeId,
    month,
    year,
    basicSalary,
    allowanceTotal,
    deductionTotal,
    overtimePay,
    bonus,
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
      // Create new payroll
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

  const activeEmployees = await prisma.employee.findMany({
    where: whereClause,
    select: { id: true, fullName: true },
  });

  let processedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const emp of activeEmployees) {
    try {
      const calc = await calculateSingleEmployeePayroll(emp.id, {
        month,
        year,
        bonus: bonus || 0,
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
