"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  Search,
  CircleDollarSign,
  LogOut,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { toast } from "sonner";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/employees": "Karyawan",
  "/departments": "Departemen",
  "/positions": "Jabatan",
  "/attendance": "Kehadiran",
  "/allowances": "Tunjangan",
  "/deductions": "Potongan",
  "/payroll": "Penggajian",
  "/reports": "Laporan",
  "/settings": "Pengaturan",
};


interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const title =
    Object.entries(pageTitles).find(([path]) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )?.[1] ?? "Halaman";

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

      {/* Page title */}
      <div className="hidden lg:block">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari..."
          className="pl-9 h-9 bg-muted/50"
        />
      </div>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        <span className="sr-only">Notifikasi</span>
      </Button>

      {/* Admin avatar & dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-full sm:rounded-lg transition-colors cursor-pointer outline-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            A
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-medium leading-none">Admin Payroll</span>
            <span className="text-xs text-muted-foreground">payrolladmin</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Administrator</span>
              <span className="text-xs font-normal text-muted-foreground">payrolladmin</span>
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

