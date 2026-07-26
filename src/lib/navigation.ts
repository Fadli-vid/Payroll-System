import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  HandCoins,
  Receipt,
  Calculator,
  FileBarChart,
  CalendarDays,
  FileText,
  User,
} from "lucide-react";

export interface AppNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

// Satu-satunya sumber daftar navigasi — dipakai Sidebar (desktop),
// AppShell (drawer mobile), dan Header (judul halaman).
export const ADMIN_NAV: AppNavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Karyawan", href: "/employees", icon: Users },
  { title: "Departemen", href: "/departments", icon: Building2 },
  { title: "Jabatan", href: "/positions", icon: Briefcase },
  { title: "Kehadiran Admin", href: "/attendance", icon: CalendarCheck },
  { title: "Tunjangan", href: "/allowances", icon: HandCoins },
  { title: "Potongan & Penalti", href: "/deductions", icon: Receipt },
  { title: "Penggajian Batch", href: "/payroll", icon: Calculator },
  { title: "Laporan", href: "/reports", icon: FileBarChart },
];

export const EMPLOYEE_NAV: AppNavItem[] = [
  { title: "Kehadiran Saya", href: "/employee/attendance", icon: CalendarDays },
  { title: "Slip Gaji Saya", href: "/employee/payslips", icon: FileText },
  { title: "Profil Saya", href: "/employee/profile", icon: User },
];

export function navForRole(role: "ADMIN" | "EMPLOYEE" | undefined): AppNavItem[] {
  return role === "EMPLOYEE" ? EMPLOYEE_NAV : ADMIN_NAV;
}

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

export function pageTitleFor(pathname: string): string {
  const all = [...ADMIN_NAV, ...EMPLOYEE_NAV];
  return all.find((item) => isNavActive(pathname, item.href))?.title ?? "Halaman";
}
