// ─── Working Hours ───────────────────────────────────────

export const WORKING_HOURS = {
  START: "08:00",
  END: "17:00",
  TOTAL_HOURS: 9,
} as const;

export const LATE_ABSENT_THRESHOLD = 60; // minutes

// ─── Payroll Calculation Basis ───────────────────────────

// Kepmenaker No. KEP-102/MEN/VI/2004 Pasal 8: upah per jam = 1/173 × upah sebulan.
export const MONTHLY_WORK_HOURS_DIVISOR = 173;

// Basis potongan absen fallback: 1 hari alpa = 1/22 gaji pokok
// (rata-rata hari kerja per bulan untuk pola 5 hari kerja/minggu).
export const DEFAULT_WORKING_DAYS_PER_MONTH = 22;

// Pengali upah lembur (flat).
// LIMITASI: Kepmenaker 102/2004 sebenarnya bertingkat (1,5× jam pertama,
// 2× jam berikutnya, tarif khusus hari libur). Sistem ini memakai flat 1,5×
// untuk semua jam lembur — penyederhanaan yang disengaja.
export const OVERTIME_MULTIPLIER = 1.5;

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

// ─── Year Options (dropdown filter) ──────────────────────

export function getYearOptions(before = 2, after = 1): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - before; y <= currentYear + after; y++) {
    years.push(y);
  }
  return years;
}

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
