import { z } from "zod/v4";

// ─── Pagination ──────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── Query Params ────────────────────────────────────────

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Department ──────────────────────────────────────────

export const departmentSchema = z.object({
  name: z.string().min(1, "Nama departemen wajib diisi").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
});

export interface DepartmentFormValues {
  name: string;
  description?: string;
}

// ─── Position ────────────────────────────────────────────

export const positionSchema = z.object({
  name: z.string().min(1, "Nama jabatan wajib diisi").max(100),
  baseAllowance: z.coerce.number()
    .min(0, "Tunjangan tidak boleh negatif")
    .default(0),
  description: z.string().max(500).optional().or(z.literal("")),
});

export interface PositionFormValues {
  name: string;
  baseAllowance: number;
  description?: string;
}

// ─── Employee ────────────────────────────────────────────

// Password opsional: kosong saat create → server memakai default awal (di-hash);
// kosong saat update → password lama dipertahankan.
export const employeeSchema = z.object({
  code: z.string().min(1, "Kode karyawan wajib diisi").max(20),
  fullName: z.string().min(1, "Nama lengkap wajib diisi").max(100),
  email: z.string().email("Format email tidak valid"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(72, "Password maksimal 72 karakter")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  bankName: z.string().max(100).optional().or(z.literal("")),
  bankAccount: z.string().max(50).optional().or(z.literal("")),
  hireDate: z.iso.date("Format tanggal tidak valid"),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED", "TERMINATED"]),
  baseSalary: z.coerce.number().min(0, "Gaji pokok tidak boleh negatif"),
  departmentId: z.string().min(1, "Departemen wajib dipilih"),
  positionId: z.string().min(1, "Jabatan wajib dipilih"),
  allowanceIds: z.array(z.string()).optional(),
  deductionIds: z.array(z.string()).optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

// ─── Attendance ──────────────────────────────────────────

const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const attendanceBaseSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  date: z.iso.date("Format tanggal tidak valid"),
  status: z.enum([
    "PRESENT",
    "LATE",
    "LEAVE",
    "SICK",
    "VACATION",
    "ABSENT",
  ]),
  checkIn: z
    .string()
    .regex(TIME_HHMM, "Format jam masuk harus HH:mm")
    .optional()
    .or(z.literal("")),
  checkOut: z
    .string()
    .regex(TIME_HHMM, "Format jam keluar harus HH:mm")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const checkOutAfterCheckIn = {
  check: (v: { checkIn?: string; checkOut?: string }) =>
    !v.checkIn || !v.checkOut || v.checkOut > v.checkIn,
  params: {
    message: "Jam keluar harus setelah jam masuk",
    path: ["checkOut"],
  },
};

export const attendanceSchema = attendanceBaseSchema.refine(
  checkOutAfterCheckIn.check,
  checkOutAfterCheckIn.params
);

// PUT /api/attendance/[id]: override eksplisit — bila dikirim, nilai ini
// menang atas hasil auto-compute (mempertahankan lembur manual/seeded).
export const attendanceUpdateSchema = attendanceBaseSchema
  .extend({
    overtimeHours: z.coerce.number().min(0).max(24).optional(),
    lateMinutes: z.coerce.number().int().min(0).optional(),
  })
  .refine(checkOutAfterCheckIn.check, checkOutAfterCheckIn.params);

export type AttendanceUpdateValues = z.infer<typeof attendanceUpdateSchema>;

export const attendanceBulkSchema = z.object({
  date: z.iso.date("Format tanggal tidak valid"),
  entries: z
    .array(
      attendanceBaseSchema
        .omit({ date: true })
        .refine(checkOutAfterCheckIn.check, checkOutAfterCheckIn.params)
    )
    .min(1, "Minimal 1 entri kehadiran")
    .max(500, "Maksimal 500 entri per permintaan"),
});

export type AttendanceBulkValues = z.infer<typeof attendanceBulkSchema>;

export interface AttendanceFormValues {
  employeeId: string;
  date: string;
  status: "PRESENT" | "LATE" | "LEAVE" | "SICK" | "VACATION" | "ABSENT";
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

// ─── Shared period (month/year) query ───────────────────

export const periodSchema = z.object({
  month: z.coerce.number().int().min(1, "Bulan 1-12").max(12, "Bulan 1-12"),
  year: z.coerce
    .number()
    .int()
    .min(2000, "Tahun tidak valid")
    .max(2100, "Tahun tidak valid"),
});

// ─── Allowance ───────────────────────────────────────────

const percentageCap = {
  check: (v: { type: "FIXED" | "PERCENTAGE"; amount: number }) =>
    v.type !== "PERCENTAGE" || v.amount <= 100,
  params: { message: "Persentase maksimal 100", path: ["amount"] },
};

export const allowanceSchema = z
  .object({
    name: z.string().min(1, "Nama tunjangan wajib diisi").max(100),
    type: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    amount: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
    description: z.string().max(500).optional().or(z.literal("")),
    isActive: z.boolean().default(true),
  })
  .refine(percentageCap.check, percentageCap.params);

export type AllowanceFormValues = z.infer<typeof allowanceSchema>;

// ─── Deduction ───────────────────────────────────────────

export const deductionSchema = z
  .object({
    name: z.string().min(1, "Nama potongan wajib diisi").max(100),
    type: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    amount: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
    description: z.string().max(500).optional().or(z.literal("")),
    isActive: z.boolean().default(true),
  })
  .refine(percentageCap.check, percentageCap.params);

export type DeductionFormValues = z.infer<typeof deductionSchema>;

// ─── Penalty Setting ─────────────────────────────────────

export const penaltySettingSchema = z
  .object({
    type: z.enum(["LATE", "ABSENT"]),
    mode: z.enum(["FIXED", "PERCENTAGE"]),
    value: z.coerce.number().min(0, "Nilai tidak boleh negatif"),
    minMinutes: z.coerce.number().min(0).default(0),
    maxMinutes: z.coerce.number().min(0).optional().nullable(),
    description: z.string().max(500).optional().or(z.literal("")),
    isActive: z.boolean().default(true),
  })
  .refine(
    (v) => v.maxMinutes == null || v.maxMinutes >= v.minMinutes,
    { message: "Batas maksimal harus ≥ batas minimal", path: ["maxMinutes"] }
  )
  .refine((v) => v.mode !== "PERCENTAGE" || v.value <= 100, {
    message: "Persentase maksimal 100",
    path: ["value"],
  });

export type PenaltySettingFormValues = z.infer<typeof penaltySettingSchema>;

export interface PenaltySetting extends PenaltySettingFormValues {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Payroll ─────────────────────────────────────────────

export const payrollGenerateSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  departmentId: z.string().optional().or(z.literal("")),
  bonus: z.coerce.number().min(0).default(0).optional(),
});

export type PayrollGenerateValues = z.infer<typeof payrollGenerateSchema>;

export const payrollStatusSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "PAID"]),
});

export type PayrollStatusValues = z.infer<typeof payrollStatusSchema>;

export interface PayrollDetailItem {
  id: string;
  payrollId: string;
  component: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
  description?: string | null;
}

export interface PayrollItem {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowanceTotal: number;
  deductionTotal: number;
  overtimePay: number;
  bonus: number;
  netSalary: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    code: string;
    fullName: string;
    email: string;
    department: {
      id: string;
      name: string;
    };
    position: {
      id: string;
      name: string;
    };
  };
  details?: PayrollDetailItem[];
}

// ─── Reports ─────────────────────────────────────────────

export interface PayrollReportSummary {
  month: number;
  year: number;
  totalEmployees: number;
  totalBasicSalary: number;
  totalAllowance: number;
  totalDeduction: number;
  totalOvertimePay: number;
  totalBonus: number;
  totalNetSalary: number;
  draftCount: number;
  approvedCount: number;
  paidCount: number;
  departmentBreakdown: {
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalNetSalary: number;
    totalAllowance: number;
    totalDeduction: number;
  }[];
}

export interface AttendanceReportSummary {
  month: number;
  year: number;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  sickCount: number;
  vacationCount: number;
  absentCount: number;
  totalLateMinutes: number;
  totalOvertimeHours: number;
  departmentBreakdown: {
    departmentId: string;
    departmentName: string;
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    totalOvertimeHours: number;
  }[];
}

// ─── Sidebar Navigation ─────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
}

