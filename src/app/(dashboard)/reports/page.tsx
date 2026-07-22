"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/src/utils/format";
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

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

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
      toast.error("Gagal mengambil laporan penggajian");
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
      toast.error("Gagal mengambil laporan kehadiran");
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

  // ─── CSV Export Handler ──────────────────────────────────
  const exportPayrollCSV = () => {
    if (!payrollReport) return;

    const headers = [
      "Departemen",
      "Jumlah Karyawan",
      "Total Tunjangan (Rp)",
      "Total Potongan (Rp)",
      "Total Gaji Bersih (Rp)",
    ];

    const rows = payrollReport.departmentBreakdown.map((d) => [
      `"${d.departmentName}"`,
      d.employeeCount,
      d.totalAllowance,
      d.totalDeduction,
      d.totalNetSalary,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_Penggajian_${MONTH_NAMES[parseInt(month, 10) - 1]}_${year}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceCSV = () => {
    if (!attendanceReport) return;

    const headers = [
      "Departemen",
      "Total Log",
      "Hadir",
      "Terlambat",
      "Alpa",
      "Total Lembur (Jam)",
    ];

    const rows = attendanceReport.departmentBreakdown.map((d) => [
      `"${d.departmentName}"`,
      d.totalRecords,
      d.presentCount,
      d.lateCount,
      d.absentCount,
      d.totalOvertimeHours,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_Kehadiran_${MONTH_NAMES[parseInt(month, 10) - 1]}_${year}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan & Analisis</h2>
          <p className="text-muted-foreground">
            Ringkasan data rekapitulasi gaji dan tingkat kehadiran karyawan.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center rounded-lg border border-border bg-muted p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("payroll")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "payroll"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Laporan Penggajian
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Filter className="h-4 w-4" /> Filter Periode:
            </div>

            <div className="w-36">
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

            <div className="w-28">
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
                  {[2024, 2025, 2026, 2027].map((y) => (
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
              className="gap-2"
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
            className="gap-2"
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
            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Pengeluaran Gaji Bersih
                </p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(payrollReport?.totalNetSalary || 0)}
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Karyawan Diproses
                </p>
                <p className="text-xl font-bold text-foreground">
                  {payrollReport?.totalEmployees || 0} Orang
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <FileBarChart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Tunjangan & Lembur
                </p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(
                    (payrollReport?.totalAllowance || 0) +
                      (payrollReport?.totalOvertimePay || 0) +
                      (payrollReport?.totalBonus || 0)
                  )}
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Potongan Karyawan
                </p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(payrollReport?.totalDeduction || 0)}
                </p>
              </div>
            </Card>
          </div>

          {/* Department Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Rekapitulasi Penggajian Per Departemen</CardTitle>
              <CardDescription>
                Rincian biaya penggajian bersih, tunjangan, dan potongan untuk bulan {MONTH_NAMES[parseInt(month, 10) - 1]} {year}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Memuat data laporan...
                </div>
              ) : !payrollReport || payrollReport.departmentBreakdown.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Belum ada data penggajian untuk periode ini.
                </div>
              ) : (
                <div className="relative overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Departemen</th>
                        <th className="px-4 py-3">Jumlah Karyawan</th>
                        <th className="px-4 py-3">Total Tunjangan</th>
                        <th className="px-4 py-3">Total Potongan</th>
                        <th className="px-4 py-3">Total Gaji Bersih</th>
                        <th className="px-4 py-3">Persentase Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
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
                          <tr key={dept.departmentId} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {dept.departmentName}
                            </td>
                            <td className="px-4 py-3">{dept.employeeCount} orang</td>
                            <td className="px-4 py-3 text-emerald-600 font-medium dark:text-emerald-400">
                              {formatCurrency(dept.totalAllowance)}
                            </td>
                            <td className="px-4 py-3 text-rose-600 font-medium dark:text-rose-400">
                              {formatCurrency(dept.totalDeduction)}
                            </td>
                            <td className="px-4 py-3 font-bold text-primary">
                              {formatCurrency(dept.totalNetSalary)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold">
                                  {percent}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Absensi Hadir
                </p>
                <p className="text-xl font-bold text-foreground">
                  {attendanceReport?.presentCount || 0} Record
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Keterlambatan Total
                </p>
                <p className="text-xl font-bold text-foreground">
                  {attendanceReport?.totalLateMinutes || 0} Menit
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <RefreshCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Jam Lembur
                </p>
                <p className="text-xl font-bold text-foreground">
                  {attendanceReport?.totalOvertimeHours || 0} Jam
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Jumlah Alpa (Absent)
                </p>
                <p className="text-xl font-bold text-foreground">
                  {attendanceReport?.absentCount || 0} Hari
                </p>
              </div>
            </Card>
          </div>

          {/* Department Attendance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Rekapitulasi Kehadiran Per Departemen</CardTitle>
              <CardDescription>
                Statistik presensi, ketersediaan, keterlambatan, dan lembur untuk bulan {MONTH_NAMES[parseInt(month, 10) - 1]} {year}.
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
                <div className="relative overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Departemen</th>
                        <th className="px-4 py-3">Total Record Log</th>
                        <th className="px-4 py-3">Total Hadir</th>
                        <th className="px-4 py-3">Terlambat</th>
                        <th className="px-4 py-3">Alpa</th>
                        <th className="px-4 py-3">Lembur (Jam)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attendanceReport.departmentBreakdown.map((d) => (
                        <tr key={d.departmentId} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {d.departmentName}
                          </td>
                          <td className="px-4 py-3">{d.totalRecords} log</td>
                          <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            {d.presentCount}
                          </td>
                          <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-medium">
                            {d.lateCount}
                          </td>
                          <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">
                            {d.absentCount}
                          </td>
                          <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                            {d.totalOvertimeHours} jam
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
