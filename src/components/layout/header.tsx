"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  CircleDollarSign,
  LogOut,
  UserCheck,
  ChevronDown,
  ShieldAlert,
  User,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/employees": "Karyawan",
  "/departments": "Departemen",
  "/positions": "Jabatan",
  "/attendance": "Kehadiran Admin",
  "/allowances": "Tunjangan",
  "/deductions": "Potongan & Penalti",
  "/payroll": "Penggajian Batch",
  "/reports": "Laporan",
  "/employee/attendance": "Kehadiran Saya (Kalender)",
  "/employee/payslips": "Slip Gaji Saya",
  "/employee/profile": "Profil Saya",
};

interface UserSessionInfo {
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userInfo, setUserInfo] = useState<UserSessionInfo | null>(null);

  const title =
    Object.entries(pageTitles).find(([path]) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )?.[1] ?? "Halaman";

  useEffect(() => {
    // Fetch profile info based on active path
    if (pathname.startsWith("/employee")) {
      fetch("/api/employee/profile")
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setUserInfo({
              name: res.data.fullName,
              email: res.data.email,
              role: "EMPLOYEE",
            });
          }
        })
        .catch(() => {});
    } else {
      setUserInfo({
        name: "Administrator",
        email: "admin@payroll.com",
        role: "ADMIN",
      });
    }
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Berhasil keluar sistem");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Gagal melakukan logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isEmployee = pathname.startsWith("/employee");

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Buka menu</span>
      </Button>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CircleDollarSign className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold">PayrollSys</span>
      </div>

      {/* Page title & Role badge */}
      <div className="hidden lg:flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <Badge variant={isEmployee ? "secondary" : "default"} className="text-xs">
          {isEmployee ? "Role: Karyawan" : "Role: Admin"}
        </Badge>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        <span className="sr-only">Notifikasi</span>
      </Button>

      {/* User avatar & dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-full sm:rounded-lg transition-colors cursor-pointer outline-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-medium leading-none truncate max-w-[140px]">
              {userInfo?.name || "Pengguna"}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {userInfo?.email || (isEmployee ? "Karyawan" : "Admin")}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            {isEmployee ? (
              <User className="h-4 w-4 text-primary" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-primary" />
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{userInfo?.name || "Pengguna"}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">
                {userInfo?.email || (isEmployee ? "Karyawan" : "admin@payroll.com")}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-destructive focus:text-destructive cursor-pointer gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>{isLoggingOut ? "Keluar..." : "Keluar / Logout"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
