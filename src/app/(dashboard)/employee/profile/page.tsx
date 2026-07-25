"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  BadgeDollarSign,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { formatCurrency, formatDate } from "@/src/utils/format";
import { EMPLOYMENT_STATUS_LABELS } from "@/src/lib/constants";

interface EmployeeProfile {
  id: string;
  code: string;
  fullName: string;
  email: string;
  password?: string;
  phone: string | null;
  address: string | null;
  hireDate: string;
  status: string;
  baseSalary: number;
  department: { name: string };
  position: { name: string; baseAllowance: number };
}

export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: res } = await axios.get("/api/employee/profile");
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch {
      toast.error("Gagal mengambil data profil karyawan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Memuat profil karyawan...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-destructive text-sm">
        Profil karyawan tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          Profil Saya
        </h2>
        <p className="text-muted-foreground">
          Informasi identitas pribadi, posisi kepegawaian, dan kredensial akun Anda.
        </p>
      </div>

      {/* Main Profile Info Card */}
      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-xl">{profile.fullName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                  {profile.code}
                </span>
                <Badge variant="outline" className="text-xs">
                  {EMPLOYMENT_STATUS_LABELS[profile.status] || profile.status}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Identity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email Resmi
              </div>
              <div className="text-sm font-medium">{profile.email}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Telepon / WhatsApp
              </div>
              <div className="text-sm font-medium">{profile.phone || "—"}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Departemen
              </div>
              <div className="text-sm font-medium">{profile.department.name}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Jabatan
              </div>
              <div className="text-sm font-medium">{profile.position.name}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Tanggal Masuk
              </div>
              <div className="text-sm font-medium">{formatDate(profile.hireDate)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <BadgeDollarSign className="h-3.5 w-3.5 text-primary" /> Gaji Pokok
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(profile.baseSalary)}
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Alamat Tempat Tinggal
            </div>
            <div className="text-sm font-medium">{profile.address || "—"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Login Credentials Box */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Kredensial Akun Login
          </CardTitle>
          <CardDescription>
            Kredensial resmi yang Anda gunakan untuk masuk ke portal karyawan ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Email Login:</span>
              <div className="text-sm font-semibold">{profile.email}</div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Password Akun:</span>
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm font-semibold">
                  {showPassword ? profile.password : "••••••••"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Catatan:</strong> Jika Anda perlu memperbarui informasi profil atau lupa password, silakan hubungi Tim Admin HRD.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
