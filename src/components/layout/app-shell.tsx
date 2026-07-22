"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
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
  Settings,
  CircleDollarSign,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Karyawan", href: "/employees", icon: Users },
  { title: "Departemen", href: "/departments", icon: Building2 },
  { title: "Jabatan", href: "/positions", icon: Briefcase },
  { title: "Kehadiran", href: "/attendance", icon: CalendarCheck },
  { title: "Tunjangan", href: "/allowances", icon: HandCoins },
  { title: "Potongan", href: "/deductions", icon: Receipt },
  { title: "Penggajian", href: "/payroll", icon: Calculator },
  { title: "Laporan", href: "/reports", icon: FileBarChart },
  { title: "Pengaturan", href: "/settings", icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 w-[280px] bg-card shadow-xl animate-in slide-in-from-left duration-300">
            {/* Logo + close */}
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">PayrollSys</span>
                  <span className="text-[11px] text-muted-foreground">
                    Manajemen Penggajian
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Nav */}
            <nav className="space-y-1 p-3">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
