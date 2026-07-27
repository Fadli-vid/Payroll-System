"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Users,
  Building2,
  Calculator,
  Clock,
  AlertTriangle,
  ArrowDownRight,
  RefreshCw,
  Briefcase,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { formatCurrency, formatDate } from "@/src/utils/format";
import {
  getEmployeeStatusVariant,
  getPayrollStatusVariant,
} from "@/src/utils/status";
import { apiErrorMessage } from "@/src/lib/api-client";
import {
  EMPLOYMENT_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
  MONTH_NAMES,
} from "@/src/lib/constants";

// ─── Types ───────────────────────────────────────────────

interface DashboardData {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    totalPositions: number;
    payrollThisMonth: number;
    totalOvertime: number;
    totalDeductions: number;
    totalAllowances: number;
    payrollCount: number;
  };
  statusCounts: {
    DRAFT: number;
    APPROVED: number;
    PAID: number;
  };
  recentEmployees: {
    id: string;
    code: string;
    fullName: string;
    email: string;
    status: string;
    department: string;
    position: string;
    baseSalary: number;
    hireDate: string;
  }[];
  recentPayrolls: {
    id: string;
    employeeName: string;
    employeeCode: string;
    month: number;
    year: number;
    netSalary: number;
    status: string;
  }[];
  monthlyChart: {
    label: string;
    total: number;
  }[];
}

// ─── Stat Card Config ────────────────────────────────────

const statCards = [
  {
    key: "totalEmployees",
    title: "Total Karyawan",
    icon: Users,
    format: (v: number) => String(v),
    color: "text-blue-600 bg-blue-100 dark:bg-blue-500/20",
    gradient: "from-blue-500/10 to-transparent",
  },
  {
    key: "totalDepartments",
    title: "Total Departemen",
    icon: Building2,
    format: (v: number) => String(v),
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20",
    gradient: "from-emerald-500/10 to-transparent",
  },
  {
    key: "totalPositions",
    title: "Total Jabatan",
    icon: Briefcase,
    format: (v: number) => String(v),
    color: "text-purple-600 bg-purple-100 dark:bg-purple-500/20",
    gradient: "from-purple-500/10 to-transparent",
  },
  {
    key: "payrollThisMonth",
    title: "Penggajian Bulan Ini",
    icon: Calculator,
    format: (v: number) => formatCurrency(v),
    color: "text-violet-600 bg-violet-100 dark:bg-violet-500/20",
    gradient: "from-violet-500/10 to-transparent",
  },
  {
    key: "totalOvertime",
    title: "Total Lembur",
    icon: Clock,
    format: (v: number) => formatCurrency(v),
    color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-500/20",
    gradient: "from-cyan-500/10 to-transparent",
  },
  {
    key: "totalDeductions",
    title: "Total Potongan",
    icon: ArrowDownRight,
    format: (v: number) => formatCurrency(v),
    color: "text-rose-600 bg-rose-100 dark:bg-rose-500/20",
    gradient: "from-rose-500/10 to-transparent",
  },
] as const;

// ─── Bar Chart Component ─────────────────────────────────

function BarChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  const maxTotal = Math.max(...data.map((d) => d.total), 0);

  if (maxTotal === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Belum ada data penggajian pada 6 bulan terakhir
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
          Buat penggajian batch pada menu <strong className="text-foreground">&quot;Penggajian Batch&quot;</strong> untuk melihat perbandingan total gaji bulanan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 sm:gap-4 h-56 pt-6 pb-2 px-2">
      {data.map((item, i) => {
        const heightPercent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
        const isHighest = item.total === maxTotal && maxTotal > 0;

        return (
          <div
            key={i}
            className="relative min-w-0 flex-1 flex flex-col items-center gap-2 group h-full justify-end"
          >
            {/* Amount label on top */}
            <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap truncate max-w-full text-center">
              {item.total > 0 ? formatCurrency(item.total) : "—"}
            </div>

            {/* Bar container */}
            <div className="w-full flex flex-col justify-end flex-1 rounded-t-lg bg-muted/20 overflow-hidden">
              {item.total > 0 ? (
                <div
                  className={`w-full rounded-t-md transition-all duration-700 ease-out ${
                    isHighest
                      ? "bg-gradient-to-t from-primary to-emerald-400 shadow-md shadow-primary/20"
                      : "bg-gradient-to-t from-primary/80 to-primary/50 group-hover:from-primary group-hover:to-primary/80"
                  }`}
                  style={{ height: `${Math.max(heightPercent, 8)}%` }}
                />
              ) : (
                <div className="w-full h-1 bg-muted-foreground/20 rounded-full" />
              )}
            </div>

            {/* Month label */}
            <span className="max-w-full truncate text-[10px] sm:text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">
              <span className="sm:hidden">{item.label.split(" ")[0]}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Loading Skeletons ───────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Dashboard Page ──────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await axios.get("/api/dashboard");
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || "Gagal memuat data dashboard");
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
      setError(apiErrorMessage(err, "Gagal memuat data dashboard"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const now = new Date();
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Selamat datang di Sistem Manajemen Penggajian.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          disabled={isLoading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error state — jangan tampilkan angka nol palsu saat gagal memuat */}
      {error && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground">
                Data dashboard tidak dapat dimuat. Periksa koneksi lalu coba lagi.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboard} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {error && !data ? null : isLoading && !data ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => {
            const value =
              data?.stats[stat.key as keyof DashboardData["stats"]] ?? 0;
            return (
              <Card
                key={stat.key}
                className={`relative overflow-hidden transition-shadow hover:shadow-md`}
              >
                {/* Subtle gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} pointer-events-none`}
                />
                <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}
                  >
                    <stat.icon className="h-[18px] w-[18px]" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold">
                    {stat.format(value as number)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payroll Status Badges */}
      {data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Status Penggajian — {currentMonthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <span className="text-sm text-muted-foreground">Draf</span>
                <span className="text-lg font-bold">
                  {data.statusCounts.DRAFT}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">Disetujui</span>
                <span className="text-lg font-bold">
                  {data.statusCounts.APPROVED}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Dibayar</span>
                <span className="text-lg font-bold">
                  {data.statusCounts.PAID}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Payroll Chart + Payroll Summary */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">
              Grafik Penggajian Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && !data ? (
              <Skeleton className="h-48 w-full" />
            ) : data?.monthlyChart ? (
              <BarChart data={data.monthlyChart} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Belum ada data penggajian.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Ringkasan {currentMonthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Karyawan Aktif
              </span>
              <span className="font-semibold">
                {data?.stats.activeEmployees ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Tunjangan
              </span>
              <span className="font-semibold">
                {formatCurrency(data?.stats.totalAllowances ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Lembur
              </span>
              <span className="font-semibold">
                {formatCurrency(data?.stats.totalOvertime ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Potongan
              </span>
              <span className="font-semibold text-rose-600">
                {formatCurrency(data?.stats.totalDeductions ?? 0)}
              </span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm font-medium">Total Penggajian</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(data?.stats.payrollThisMonth ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Employees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Karyawan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden sm:table-cell">Departemen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tgl Masuk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && !data ? (
                    <TableSkeleton rows={5} cols={4} />
                  ) : data?.recentEmployees &&
                    data.recentEmployees.length > 0 ? (
                    data.recentEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium truncate max-w-[160px] sm:max-w-none">{emp.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {emp.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">
                          {emp.department}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getEmployeeStatusVariant(emp.status)}
                            className="text-xs"
                          >
                            {EMPLOYMENT_STATUS_LABELS[emp.status] ?? emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatDate(emp.hireDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-32 text-center text-sm text-muted-foreground"
                      >
                        Belum ada data karyawan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payrolls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Penggajian Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead className="hidden sm:table-cell">Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gaji Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && !data ? (
                    <TableSkeleton rows={5} cols={4} />
                  ) : data?.recentPayrolls &&
                    data.recentPayrolls.length > 0 ? (
                    data.recentPayrolls.map((pay) => (
                      <TableRow key={pay.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium truncate max-w-[160px] sm:max-w-none">
                              {pay.employeeName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pay.employeeCode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">
                          {MONTH_NAMES[pay.month - 1]} {pay.year}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPayrollStatusVariant(pay.status)}
                            className="text-xs"
                          >
                            {PAYROLL_STATUS_LABELS[pay.status] ?? pay.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(pay.netSalary)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-32 text-center text-sm text-muted-foreground"
                      >
                        Belum ada data penggajian.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
