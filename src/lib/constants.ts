// ─── Working Hours ───────────────────────────────────────

export const WORKING_HOURS = {
  START: "08:00",
  END: "17:00",
  TOTAL_HOURS: 9,
} as const;

export const WORKING_DAYS = [1, 2, 3, 4, 5] as const; // Monday–Friday

// ─── Late Deduction Tiers (IDR) ──────────────────────────

export const LATE_RULES = [
  { minMinutes: 0, maxMinutes: 10, deduction: 0 },
  { minMinutes: 11, maxMinutes: 30, deduction: 10_000 },
  { minMinutes: 31, maxMinutes: 60, deduction: 25_000 },
  // > 60 minutes → automatically marked ABSENT
] as const;

export const LATE_ABSENT_THRESHOLD = 60; // minutes

// ─── Overtime Rate (IDR per hour) ────────────────────────

export const OVERTIME_RATE = 25_000;

// ─── Attendance Status Labels (Indonesian) ───────────────

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: "Hadir",
  LATE: "Terlambat",
  LEAVE: "Cuti",
  SICK: "Sakit",
  VACATION: "Liburan",
  ABSENT: "Tidak Hadir",
};

// ─── Employment Status Labels (Indonesian) ───────────────

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Tidak Aktif",
  RESIGNED: "Mengundurkan Diri",
  TERMINATED: "Diberhentikan",
};

// ─── Payroll Status Labels (Indonesian) ──────────────────

export const PAYROLL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  APPROVED: "Disetujui",
  PAID: "Dibayar",
};

// ─── Payroll Detail Component Names ──────────────────────

export const PAYROLL_COMPONENTS = {
  BASIC_SALARY: "Gaji Pokok",
  OVERTIME: "Lembur",
  BONUS: "Bonus",
  LATE_DEDUCTION: "Potongan Keterlambatan",
  ABSENT_DEDUCTION: "Potongan Ketidakhadiran",
} as const;

// ─── Pagination ──────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// ─── Month Names (Indonesian) ────────────────────────────

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;
