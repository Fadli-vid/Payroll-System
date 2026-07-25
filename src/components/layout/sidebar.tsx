"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import {
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  HandCoins,
  Receipt,
  Calculator,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CalendarDays,
  FileText,
  User,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";

const adminNavItems = [
  { title: "Karyawan", href: "/employees", icon: Users },
  { title: "Departemen", href: "/departments", icon: Building2 },
  { title: "Jabatan", href: "/positions", icon: Briefcase },
  { title: "Kehadiran Admin", href: "/attendance", icon: CalendarCheck },
  { title: "Tunjangan", href: "/allowances", icon: HandCoins },
  { title: "Potongan & Penalti", href: "/deductions", icon: Receipt },
  { title: "Penggajian Batch", href: "/payroll", icon: Calculator },
  { title: "Laporan", href: "/reports", icon: FileBarChart },
];

const employeeNavItems = [
  { title: "Kehadiran Saya", href: "/employee/attendance", icon: CalendarDays },
  { title: "Slip Gaji Saya", href: "/employee/payslips", icon: FileText },
  { title: "Profil Saya", href: "/employee/profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isEmployeeRole = pathname.startsWith("/employee/");
  const navItems = isEmployeeRole ? employeeNavItems : adminNavItems;

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CircleDollarSign className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold tracking-tight">
              PayrollSys
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {isEmployeeRole ? "Portal Karyawan" : "Manajemen Admin"}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Kecilkan</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
