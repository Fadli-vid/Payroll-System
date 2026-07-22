"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleDollarSign, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("from") || "/";

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !password) {
      setErrorMsg("ID Admin dan Password wajib diisi");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), password }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = {};

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Server mengembalikan respon tidak valid (${res.status} ${res.statusText})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login gagal. Periksa ID Admin & Password.");
      }

      toast.success("Selamat datang! Login berhasil.", {
        description: "Mengalihkan ke sistem penggajian...",
      });

      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem saat login.");
      toast.error(err.message || "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-xl backdrop-blur-xl bg-card/95">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>Login Admin</span>
        </CardTitle>
        <CardDescription>
          Masukkan ID Admin & Password resmi Anda.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg text-sm bg-destructive/10 text-destructive border border-destructive/20 animate-in fade-in duration-200">
              {errorMsg}
            </div>
          )}

          {/* ID Admin Input */}
          <div className="space-y-2">
            <Label htmlFor="admin-id">ID Admin</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="admin-id"
                type="text"
                placeholder="Masukkan ID Admin"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="pl-9 h-11"
                disabled={isLoading}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 h-11"
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">Toggle password visibility</span>
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold gap-2 shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Memproses...</span>
              </div>
            ) : (
              <>
                <span>Masuk ke System</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-8 ring-primary/10 transition-transform duration-300 hover:scale-105">
            <CircleDollarSign className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            PayrollSys Admin
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Masuk dengan kredensial administrator untuk mengelola sistem penggajian.
          </p>
        </div>

        {/* Login Form with Suspense Boundary */}
        <Suspense
          fallback={
            <Card className="border-border/60 shadow-xl backdrop-blur-xl bg-card/95 p-8 text-center space-y-4">
              <div className="flex justify-center">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
              <p className="text-sm text-muted-foreground">Memuat halaman login...</p>
            </Card>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer Info */}
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PayrollSys &bull; System Management Penggajian
        </p>
      </div>
    </div>
  );
}
