"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Users,
  Building2,
  Calculator,
  TrendingUp,
  Clock,
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

// ─── Status Badge Variant Map ────────────────────────────

function getEmployeeStatusVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "INACTIVE":
      return "secondary";
    case "RESIGNED":
      return "outline";
    case "TERMINATED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getPayrollStatusVariant(status: string) {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "APPROVED":
      return "default";
    case "PAID":
      return "outline";
    default:
      return "secondary";
  }
}

// ─── Bar Chart Component ─────────────────────────────────

function BarChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  const maxValue = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end gap-2 h-48 pt-4">
      {data.map((item, i) => {
        const heightPercent = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-2 group"
          >
            {/* Value tooltip */}
            <div className="text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {formatCurrency(item.total)}
            </div>
            {/* Bar */}
            <div className="w-full flex flex-col justify-end h-full">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60 transition-all duration-500 ease-out hover:from-primary hover:to-primary/80 min-h-[4px]"
                style={{ height: `${Math.max(heightPercent, 3)}%` }}
              />
            </div>
            {/* Label */}
            <span className="text-[10px] text-muted-foreground font-medium">
              {item.label}
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

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("/api/dashboard");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
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
      <div className="flex items-center justify-between">
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
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      {isLoading && !data ? (
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
                    <TableHead>Departemen</TableHead>
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
                            <div className="font-medium">{emp.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {emp.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
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
                    <TableHead>Periode</TableHead>
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
                            <div className="font-medium">
                              {pay.employeeName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pay.employeeCode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
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
