"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { ChevronLeft, ChevronRight, CircleDollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { useSession } from "@/src/components/providers/session-provider";
import { navForRole, isNavActive } from "@/src/lib/navigation";

const COLLAPSE_STORAGE_KEY = "payrollsys.sidebar.collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  // Pulihkan state collapse dari localStorage (di effect agar bebas hydration mismatch)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi one-shot dari localStorage saat mount
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage tidak tersedia — abaikan
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // abaikan
      }
      return next;
    });
  };

  // Fallback heuristik path saat sesi masih dimuat
  const isEmployeeRoute =
    pathname.startsWith("/employee/") || pathname === "/employee";
  const role = user?.role ?? (isEmployeeRoute ? "EMPLOYEE" : "ADMIN");
  const navItems = navForRole(role);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out print:hidden",
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
                {role === "EMPLOYEE" ? "Portal Karyawan" : "Manajemen Admin"}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = isNavActive(pathname, item.href);

            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-label={collapsed ? item.title : undefined}
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

            if (!collapsed) return link;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Perbesar sidebar" : "Kecilkan sidebar"}
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
    </TooltipProvider>
  );
}
