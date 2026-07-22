"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  payrollGenerateSchema,
  PayrollGenerateValues,
  PayrollItem,
} from "@/src/types";
import { formatCurrency } from "@/src/utils/format";
import axios from "axios";
import { toast } from "sonner";

import { DataTable, Column } from "@/src/components/layout/data-table";
import { ConfirmDialog } from "@/src/components/layout/confirm-dialog";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Badge } from "@/src/components/ui/badge";
import {
  Calculator,
  CheckCircle2,
  DollarSign,
  FileText,
  Filter,
  MoreHorizontal,
  RefreshCcw,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";

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

interface DepartmentOption {
  id: string;
  name: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const currentDate = new Date();

  // ─── State ───────────────────────────────────────────────
  const [data, setData] = useState<PayrollItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(currentDate.getMonth() + 1)
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    String(currentDate.getFullYear())
  );
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalBasicSalary: 0,
    totalAllowance: 0,
    totalDeduction: 0,
    totalOvertimePay: 0,
    totalBonus: 0,
    totalNetSalary: 0,
  });

  // Dialogs
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ─── Form ──────────────────────────────────────────────
  const form = useForm<PayrollGenerateValues>({
    resolver: zodResolver(payrollGenerateSchema as any),
    defaultValues: {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      departmentId: "all",
      bonus: 0,
    },
  });

  // ─── Fetch Departments ─────────────────────────────────
  useEffect(() => {
    async function loadDepts() {
      try {
        const { data: res } = await axios.get("/api/departments?pageSize=100");
        const deptList = res.data?.data || res.data || [];
        setDepartments(Array.isArray(deptList) ? deptList : []);
      } catch (err) {
        console.error("Gagal memuat departemen", err);
      }
    }
    loadDepts();
  }, []);

  // ─── Data Fetching ───────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize,
        search,
      };

      if (selectedMonth && selectedMonth !== "all") {
        params.month = selectedMonth;
      }
      if (selectedYear && selectedYear !== "all") {
        params.year = selectedYear;
      }
      if (selectedDept && selectedDept !== "all") {
        params.departmentId = selectedDept;
      }
      if (selectedStatus && selectedStatus !== "ALL") {
        params.status = selectedStatus;
      }

      const { data: response } = await axios.get("/api/payroll", { params });

      setData(response.data?.data || []);
      setTotal(response.data?.meta?.total || 0);
      if (response.data?.summary) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      toast.error("Gagal mengambil data penggajian");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, selectedMonth, selectedYear, selectedDept, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handlers ────────────────────────────────────────────
  const handleGenerateSubmit = async (values: PayrollGenerateValues) => {
    setIsGenerating(true);
    try {
      const { data: res } = await axios.post("/api/payroll/generate", values);
      toast.success(res.message || "Penggajian berhasil di-generate");
      setIsGenerateOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal memproses pembuatan gaji"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: "DRAFT" | "APPROVED" | "PAID"
  ) => {
    try {
      const { data: res } = await axios.patch(`/api/payroll/${id}`, {
        status: newStatus,
      });
      toast.success(res.message || `Status diubah menjadi ${newStatus}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memperbarui status");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await axios.delete(`/api/payroll/${deletingId}`);
      toast.success("Data penggajian berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menghapus data");
    }
  };

  // ─── Columns ─────────────────────────────────────────────
  const columns: Column<PayrollItem>[] = [
    {
      key: "employee",
      header: "Karyawan",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {row.employee.fullName}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.employee.code} • {row.employee.department.name} ({row.employee.position.name})
          </span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Periode",
      render: (row) => (
        <span className="text-sm font-medium">
          {MONTH_NAMES[row.month - 1]} {row.year}
        </span>
      ),
    },
    {
      key: "basicSalary",
      header: "Gaji Pokok",
      render: (row) => formatCurrency(row.basicSalary),
    },
    {
      key: "allowanceTotal",
      header: "Tunjangan",
      render: (row) => (
        <span className="text-emerald-600 font-medium dark:text-emerald-400">
          +{formatCurrency(row.allowanceTotal)}
        </span>
      ),
    },
    {
      key: "deductionTotal",
      header: "Potongan",
      render: (row) => (
        <span className="text-rose-600 font-medium dark:text-rose-400">
          -{formatCurrency(row.deductionTotal)}
        </span>
      ),
    },
    {
      key: "overtimePay",
      header: "Lembur / Bonus",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          {row.overtimePay > 0 && (
            <div className="text-blue-600 dark:text-blue-400">
              Lembur: +{formatCurrency(row.overtimePay)}
            </div>
          )}
          {row.bonus > 0 && (
            <div className="text-amber-600 dark:text-amber-400">
              Bonus: +{formatCurrency(row.bonus)}
            </div>
          )}
          {row.overtimePay === 0 && row.bonus === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "netSalary",
      header: "Gaji Bersih",
      render: (row) => (
        <span className="font-bold text-primary text-base">
          {formatCurrency(row.netSalary)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        let colorClasses = "";

        if (row.status === "DRAFT") {
          colorClasses = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
        } else if (row.status === "APPROVED") {
          colorClasses = "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
        } else if (row.status === "PAID") {
          colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
        }

        return <Badge className={colorClasses}>{row.status}</Badge>;
      },
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Buka menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi Gaji</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/payroll/${row.id}`)}>
              <FileText className="mr-2 h-4 w-4" />
              Lihat Slip Gaji
            </DropdownMenuItem>

            {row.status === "DRAFT" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange(row.id, "APPROVED")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                Setujui (APPROVED)
              </DropdownMenuItem>
            )}

            {row.status === "APPROVED" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange(row.id, "PAID")}
              >
                <Wallet className="mr-2 h-4 w-4 text-emerald-600" />
                Tandai Dibayar (PAID)
              </DropdownMenuItem>
            )}

            {row.status === "DRAFT" && (
              <DropdownMenuItem
                onClick={() => {
                  setDeletingId(row.id);
                  setIsDeleteDialogOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Draft
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Penggajian</h2>
          <p className="text-muted-foreground">
            Hitung, tinjau, dan kelola proses pembagian gaji karyawan.
          </p>
        </div>
        <Button
          onClick={() => setIsGenerateOpen(true)}
          className="gap-2 self-start sm:self-auto"
        >
          <Calculator className="h-4 w-4" />
          Generate Gaji
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              Total Gaji Bersih
            </p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(summary.totalNetSalary)}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              Total Tunjangan
            </p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(summary.totalAllowance)}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              Total Potongan
            </p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(summary.totalDeduction)}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <RefreshCcw className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              Total Lembur + Bonus
            </p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(summary.totalOvertimePay + summary.totalBonus)}
            </p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mr-2">
              <Filter className="h-4 w-4" /> Filter:
            </div>

            {/* Month Filter */}
            <div className="w-36">
              <Select
                value={selectedMonth}
                onValueChange={(val) => {
                  if (val) setSelectedMonth(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {MONTH_NAMES.map((m, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="w-28">
              <Select
                value={selectedYear}
                onValueChange={(val) => {
                  if (val) setSelectedYear(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  if (val) setSelectedStatus(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="w-44">
              <Select
                value={selectedDept}
                onValueChange={(val) => {
                  if (val) setSelectedDept(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Departemen</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="ml-auto gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Daftar Penggajian Karyawan</CardTitle>
          <CardDescription>
            Tabel daftar hasil perhitungan penggajian karyawan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data}
            columns={columns}
            total={total}
            page={page}
            pageSize={pageSize}
            isLoading={isLoading}
            onPageChange={setPage}
            onSearchChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            searchPlaceholder="Cari karyawan atau kode..."
          />
        </CardContent>
      </Card>

      {/* Generate Payroll Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Generate Penggajian Bulanan</DialogTitle>
            <DialogDescription>
              Sistem akan menghitung gaji pokok, tunjangan, potongan, dan lembur secara otomatis untuk seluruh karyawan aktif.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(handleGenerateSubmit as any)}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Bulan Target</Label>
                <Select
                  value={String(form.watch("month"))}
                  onValueChange={(val) => {
                    if (val) form.setValue("month", parseInt(val, 10));
                  }}
                >
                  <SelectTrigger id="month">
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

              <div className="space-y-2">
                <Label htmlFor="year">Tahun Target</Label>
                <Select
                  value={String(form.watch("year"))}
                  onValueChange={(val) => {
                    if (val) form.setValue("year", parseInt(val, 10));
                  }}
                >
                  <SelectTrigger id="year">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="departmentId">Departemen (Opsional)</Label>
              <Select
                value={form.watch("departmentId") || "all"}
                onValueChange={(val) => {
                  if (val) form.setValue("departmentId", val);
                }}
              >
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Semua Departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Departemen (Semua Karyawan)</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonus">Bonus Tambahan / Insentif (Rp)</Label>
              <Input
                id="bonus"
                type="number"
                placeholder="0"
                {...form.register("bonus")}
              />
              <p className="text-[11px] text-muted-foreground">
                Bonus ini akan ditambahkan secara rata ke seluruh karyawan yang diproses.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGenerateOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Memproses..." : "Mulai Generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Hapus Draft Gaji"
        description="Apakah Anda yakin ingin menghapus data penggajian DRAFT ini? Anda dapat meng-generate ulang gaji ini kapan saja."
        confirmLabel="Hapus Draft"
        cancelLabel="Batal"
      />
    </div>
  );
}
