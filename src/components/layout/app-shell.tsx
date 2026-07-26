"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CircleDollarSign } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/src/components/ui/sheet";
import { useSession } from "@/src/components/providers/session-provider";
import { navForRole, isNavActive } from "@/src/lib/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useSession();

  // Drawer mobile memakai daftar nav sesuai role (sama dengan sidebar desktop)
  const isEmployeeRoute =
    pathname.startsWith("/employee/") || pathname === "/employee";
  const role = user?.role ?? (isEmployeeRoute ? "EMPLOYEE" : "ADMIN");
  const navItems = navForRole(role);

  // Tutup drawer saat viewport melewati lg — SheetContent disembunyikan via
  // lg:hidden, tapi overlay-nya tidak menerima className sehingga akan
  // tertinggal sebagai backdrop tak terlihat yang memblokir klik.
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileMenuOpen(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-background print:h-auto print:overflow-visible">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 lg:hidden data-[side=left]:w-[min(280px,85vw)]">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <SheetTitle className="text-sm font-bold">PayrollSys</SheetTitle>
              <span className="text-[11px] text-muted-foreground">
                {role === "EMPLOYEE" ? "Portal Karyawan" : "Manajemen Penggajian"}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">
            {navItems.map((item) => {
              const isActive = isNavActive(pathname, item.href);

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
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
