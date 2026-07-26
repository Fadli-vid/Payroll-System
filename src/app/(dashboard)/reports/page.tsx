"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/src/utils/format";
import { MONTH_NAMES, getYearOptions } from "@/src/lib/constants";
import { apiErrorMessage } from "@/src/lib/api-client";
import { downloadCSV } from "@/src/utils/csv";
import axios from "axios";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { StatCard } from "@/src/components/shared/stat-card";
import {
  Building2,
  CalendarCheck,
  Clock,
  Download,
  FileBarChart,
  Filter,
  RefreshCcw,
  Users,
  Wallet,
} from "lucide-react";
import { PayrollReportSummary, AttendanceReportSummary } from "@/src/types";

export default function ReportsPage() {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState<"payroll" | "attendance">("payroll");

  // Filters
  const [month, setMonth] = useState<string>(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState<string>(String(currentDate.getFullYear()));

  // Data States
  const [payrollReport, setPayrollReport] = useState<PayrollReportSummary | null>(null);
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Fetch Payroll Report ─────────────────────────────────
  const fetchPayrollReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: res } = await axios.get("/api/reports/payroll", {
        params: { month, year },
      });
      setPayrollReport(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Gagal mengambil laporan penggajian"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  // ─── Fetch Attendance Report ──────────────────────────────
  const fetchAttendanceReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: res } = await axios.get("/api/reports/attendance", {
        params: { month, year },
      });
      setAttendanceReport(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Gagal mengambil laporan kehadiran"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    if (activeTab === "payroll") {
      fetchPayrollReport();
    } else {
      fetchAttendanceReport();
    }
  }, [activeTab, fetchPayrollReport, fetchAttendanceReport]);

  const periodLabel = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;

  const activeReportEmpty =
    activeTab === "payroll"
      ? !payrollReport || payrollReport.departmentBreakdown.length === 0
      : !attendanceReport || attendanceReport.departmentBreakdown.length === 0;

  // ─── CSV Export Handlers ─────────────────────────────────
  const exportPayrollCSV = () => {
    if (!payrollReport || payrollReport.departmentBreakdown.length === 0) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }
    downloadCSV(
      `Laporan_Penggajian_${MONTH_NAMES[parseInt(month, 10) - 1]}_${year}.csv`,
      [
        "Departemen",
        "Jumlah Karyawan",
        "Total Tunjangan (Rp)",
        "Total Potongan (Rp)",
        "Total Gaji Bersih (Rp)",
      ],
      payrollReport.departmentBreakdown.map((d) => [
        d.departmentName,
        d.employeeCount,
        d.totalAllowance,
        d.totalDeduction,
        d.totalNetSalary,
      ])
    );
  };

  const exportAttendanceCSV = () => {
    if (!attendanceReport || attendanceReport.departmentBreakdown.length === 0) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }
    downloadCSV(
      `Laporan_Kehadiran_${MONTH_NAMES[parseInt(month, 10) - 1]}_${year}.csv`,
      ["Departemen", "Total Log", "Hadir", "Terlambat", "Alpa", "Total Lembur (Jam)"],
      attendanceReport.departmentBreakdown.map((d) => [
        d.departmentName,
        d.totalRecords,
        d.presentCount,
        d.lateCount,
        d.absentCount,
        d.totalOvertimeHours,
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan & Analisis</h2>
          <p className="text-muted-foreground">
            Ringkasan data rekapitulasi gaji dan tingkat kehadiran karyawan.
            Angka uang hanya menghitung gaji berstatus Disetujui/Dibayar.
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          role="tablist"
          aria-label="Jenis laporan"
          className="grid w-full grid-cols-2 items-center rounded-lg border border-border bg-muted p-1 self-start sm:inline-flex sm:w-auto sm:self-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === "payroll"}
            onClick={() => setActiveTab("payroll")}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:py-1.5 ${
              activeTab === "payroll"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Laporan Penggajian
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:py-1.5 ${
              activeTab === "attendance"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            Laporan Kehadiran
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Filter className="h-4 w-4" /> Filter Periode:
            </div>

            <div className="w-full sm:w-36">
              <Select
                value={month}
                onValueChange={(val) => {
                  if (val) setMonth(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-28">
              <Select
                value={year}
                onValueChange={(val) => {
                  if (val) setYear(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={
                activeTab === "payroll"
                  ? fetchPayrollReport
                  : fetchAttendanceReport
              }
              disabled={isLoading}
              className="w-full gap-2 sm:w-auto"
            >
              <RefreshCcw className="h-4 w-4" />
              Muat Ulang
            </Button>
          </div>

          <Button
            size="sm"
            onClick={
              activeTab === "payroll" ? exportPayrollCSV : exportAttendanceCSV
            }
            disabled={isLoading || activeReportEmpty}
            className="w-full gap-2 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Payroll Report Tab Content */}
      {activeTab === "payroll" && (
        <div className="space-y-6">
          {/* KPI Summary Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Total Pengeluaran Gaji Bersih"
              value={formatCurrency(payrollReport?.totalNetSalary || 0)}
            />
            <StatCard
              icon={Users}
              label="Total Karyawan Diproses"
              value={`${payrollReport?.totalEmployees || 0} Orang`}
              iconClassName="bg-emerald-500/10 text-emerald-600"
            />
            <StatCard
              icon={FileBarChart}
              label="Total Tunjangan & Lembur"
              value={formatCurrency(
                (payrollReport?.totalAllowance || 0) +
                  (payrollReport?.totalOvertimePay || 0) +
                  (payrollReport?.totalBonus || 0)
              )}
              iconClassName="bg-blue-500/10 text-blue-600"
            />
            <StatCard
              icon={Building2}
              label="Total Potongan Karyawan"
              value={formatCurrency(payrollReport?.totalDeduction || 0)}
              iconClassName="bg-rose-500/10 text-rose-600"
            />
          </div>

          {/* Department Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Rekapitulasi Penggajian Per Departemen</CardTitle>
              <CardDescription>
                Rincian biaya penggajian bersih, tunjangan, dan potongan untuk
                bulan {periodLabel} (gaji Disetujui/Dibayar
                {payrollReport && payrollReport.draftCount > 0
                  ? `; ${payrollReport.draftCount} draf belum termasuk`
                  : ""}
                ).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Memuat data laporan...
                </div>
              ) : !payrollReport || payrollReport.departmentBreakdown.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Belum ada data penggajian final untuk periode ini.
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Departemen</TableHead>
                        <TableHead className="hidden md:table-cell">Jumlah Karyawan</TableHead>
                        <TableHead className="hidden lg:table-cell">Total Tunjangan</TableHead>
                        <TableHead className="hidden lg:table-cell">Total Potongan</TableHead>
                        <TableHead>Total Gaji Bersih</TableHead>
                        <TableHead>Persentase Biaya</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollReport.departmentBreakdown.map((dept) => {
                        const percent =
                          payrollReport.totalNetSalary > 0
                            ? Math.round(
                                (dept.totalNetSalary /
                                  payrollReport.totalNetSalary) *
                                  100
                              )
                            : 0;

                        return (
                          <TableRow key={dept.departmentId}>
                            <TableCell className="font-semibold text-foreground">
                              {dept.departmentName}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{dept.employeeCount} orang</TableCell>
                            <TableCell className="hidden text-emerald-600 font-medium dark:text-emerald-400 lg:table-cell">
                              {formatCurrency(dept.totalAllowance)}
                            </TableCell>
                            <TableCell className="hidden text-rose-600 font-medium dark:text-rose-400 lg:table-cell">
                              {formatCurrency(dept.totalDeduction)}
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              {formatCurrency(dept.totalNetSalary)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 rounded-full bg-muted overflow-hidden sm:w-24">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold">
                                  {percent}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Report Tab Content */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Attendance KPI Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={CalendarCheck}
              label="Total Absensi Hadir"
              value={`${attendanceReport?.presentCount || 0} Record`}
              iconClassName="bg-emerald-500/10 text-emerald-600"
            />
            <StatCard
              icon={Clock}
              label="Keterlambatan Total"
              value={`${attendanceReport?.totalLateMinutes || 0} Menit`}
              iconClassName="bg-amber-500/10 text-amber-600"
            />
            <StatCard
              icon={RefreshCcw}
              label="Total Jam Lembur"
              value={`${attendanceReport?.totalOvertimeHours || 0} Jam`}
              iconClassName="bg-blue-500/10 text-blue-600"
            />
            <StatCard
              icon={Users}
              label="Jumlah Alpa (Absent)"
              value={`${attendanceReport?.absentCount || 0} Hari`}
              iconClassName="bg-rose-500/10 text-rose-600"
            />
          </div>

          {/* Department Attendance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Rekapitulasi Kehadiran Per Departemen</CardTitle>
              <CardDescription>
                Statistik presensi, ketersediaan, keterlambatan, dan lembur untuk bulan {periodLabel}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Memuat data laporan kehadiran...
                </div>
              ) : !attendanceReport || attendanceReport.departmentBreakdown.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Belum ada data kehadiran untuk periode ini.
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Departemen</TableHead>
                        <TableHead className="hidden md:table-cell">Total Record Log</TableHead>
                        <TableHead>Total Hadir</TableHead>
                        <TableHead>Terlambat</TableHead>
                        <TableHead>Alpa</TableHead>
                        <TableHead className="hidden sm:table-cell">Lembur (Jam)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceReport.departmentBreakdown.map((d) => (
                        <TableRow key={d.departmentId}>
                          <TableCell className="font-semibold text-foreground">
                            {d.departmentName}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{d.totalRecords} log</TableCell>
                          <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {d.presentCount}
                          </TableCell>
                          <TableCell className="text-amber-600 dark:text-amber-400 font-medium">
                            {d.lateCount}
                          </TableCell>
                          <TableCell className="text-rose-600 dark:text-rose-400 font-medium">
                            {d.absentCount}
                          </TableCell>
                          <TableCell className="hidden font-bold text-blue-600 dark:text-blue-400 sm:table-cell">
                            {d.totalOvertimeHours} jam
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
