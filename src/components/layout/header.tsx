"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  ShieldCheck,
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
import { useSession } from "@/src/components/providers/session-provider";
import { pageTitleFor } from "@/src/lib/navigation";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isSessionLoading } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // SSR-safe "mounted" flag (hindari hydration mismatch untuk ikon tema)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const title = pageTitleFor(pathname);

  // Fallback heuristik saat sesi masih dimuat (hindari flash role yang salah)
  const isEmployeeRoute =
    pathname.startsWith("/employee/") || pathname === "/employee";
  const currentRole = user?.role || (isEmployeeRoute ? "EMPLOYEE" : "ADMIN");

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

  const displayName = user?.name || (isSessionLoading ? "…" : "Pengguna");
  const displayEmail = user?.email || "";

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6 print:hidden">
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

      {/* Page title & Role badge */}
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-base font-semibold tracking-tight lg:text-lg">{title}</h1>
        <Badge
          variant={currentRole === "EMPLOYEE" ? "secondary" : "default"}
          className="text-xs hidden lg:inline-flex"
        >
          {currentRole === "EMPLOYEE" ? "Role: Karyawan" : "Role: Admin"}
        </Badge>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle */}
      {mounted && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={
            resolvedTheme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"
          }
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      )}

      {/* User avatar & dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-full sm:rounded-lg transition-colors cursor-pointer outline-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-medium leading-none truncate max-w-[140px]">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {displayEmail}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            {currentRole === "EMPLOYEE" ? (
              <User className="h-4 w-4 text-primary" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-primary" />
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{displayName}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">
                {displayEmail}
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
