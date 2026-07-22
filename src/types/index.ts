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

export const employeeSchema = z.object({
  code: z.string().min(1, "Kode karyawan wajib diisi").max(20),
  fullName: z.string().min(1, "Nama lengkap wajib diisi").max(100),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  hireDate: z.string().min(1, "Tanggal masuk wajib diisi"),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED", "TERMINATED"]),
  baseSalary: z.coerce.number().min(0, "Gaji pokok tidak boleh negatif"),
  departmentId: z.string().min(1, "Departemen wajib dipilih"),
  positionId: z.string().min(1, "Jabatan wajib dipilih"),
});

export interface EmployeeFormValues {
  code: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  hireDate: string;
  status: "ACTIVE" | "INACTIVE" | "RESIGNED" | "TERMINATED";
  baseSalary: number;
  departmentId: string;
  positionId: string;
}

// ─── Attendance ──────────────────────────────────────────

export const attendanceSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  status: z.enum([
    "PRESENT",
    "LATE",
    "LEAVE",
    "SICK",
    "VACATION",
    "ABSENT",
  ]),
  checkIn: z.string().optional().or(z.literal("")),
  checkOut: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export interface AttendanceFormValues {
  employeeId: string;
  date: string;
  status: "PRESENT" | "LATE" | "LEAVE" | "SICK" | "VACATION" | "ABSENT";
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

// ─── Allowance ───────────────────────────────────────────

export const allowanceSchema = z.object({
  name: z.string().min(1, "Nama tunjangan wajib diisi").max(100),
  amount: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export interface AllowanceFormValues {
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
}

// ─── Deduction ───────────────────────────────────────────

export const deductionSchema = z.object({
  name: z.string().min(1, "Nama potongan wajib diisi").max(100),
  amount: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type DeductionFormValues = z.infer<typeof deductionSchema>;

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

