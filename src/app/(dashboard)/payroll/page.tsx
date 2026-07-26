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
import {
  MONTH_NAMES,
  PAYROLL_STATUS_LABELS,
  getYearOptions,
} from "@/src/lib/constants";
import { apiErrorMessage } from "@/src/lib/api-client";
import { useDeleteConfirm } from "@/src/hooks/use-delete-confirm";
import axios from "axios";
import { toast } from "sonner";

import { DataTable, Column } from "@/src/components/layout/data-table";
import { ConfirmDialog } from "@/src/components/layout/confirm-dialog";
import { StatCard } from "@/src/components/shared/stat-card";
import { MoneyInput } from "@/src/components/shared/money-input";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
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

interface DepartmentOption {
  id: string;
  name: string;
}

interface GenerateResult {
  totalEmployees: number;
  processedCount: number;
  skippedCount: number;
  errors: string[];
  message?: string;
}

type StatusChangeRequest = {
  row: PayrollItem;
  next: "DRAFT" | "APPROVED" | "PAID";
};

const STATUS_CHANGE_COPY: Record<
  StatusChangeRequest["next"],
  { title: string; label: string; variant: "default" | "destructive" }
> = {
  APPROVED: { title: "Setujui Gaji", label: "Setujui", variant: "default" },
  PAID: { title: "Tandai Dibayar", label: "Tandai Dibayar", variant: "default" },
  DRAFT: {
    title: "Kembalikan ke Draft",
    label: "Kembalikan ke Draft",
    variant: "destructive",
  },
};

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [statusChange, setStatusChange] = useState<StatusChangeRequest | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isApproveAllOpen, setIsApproveAllOpen] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

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
        const deptList = res.data?.data || [];
        setDepartments(Array.isArray(deptList) ? deptList : []);
      } catch (err) {
        console.error("Gagal memuat departemen", err);
        toast.error("Gagal memuat daftar departemen untuk filter");
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
      const result: GenerateResult | undefined = res.data;

      setIsGenerateOpen(false);
      if (result) {
        setGenerateResult(result);
        if (result.skippedCount > 0 || (result.errors?.length ?? 0) > 0) {
          toast.warning(
            `${result.processedCount} diproses, ${result.skippedCount} dilewati — periksa rincian hasil.`
          );
        } else if (result.processedCount === 0) {
          toast.warning("Tidak ada karyawan yang diproses untuk periode ini.");
        } else {
          toast.success(`${result.processedCount} slip gaji berhasil di-generate.`);
        }
      } else {
        toast.success("Penggajian berhasil di-generate");
      }
      fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Gagal memproses pembuatan gaji"));
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusChange) return;
    setIsChangingStatus(true);
    try {
      const { data: res } = await axios.patch(`/api/payroll/${statusChange.row.id}`, {
        status: statusChange.next,
      });
      toast.success(
        res.data?.message ||
          `Status diubah menjadi ${PAYROLL_STATUS_LABELS[statusChange.next]}`
      );
      setStatusChange(null);
      fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Gagal memperbarui status"));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const requestApproveAll = () => {
    if (selectedMonth === "all" || selectedYear === "all") {
      toast.info(
        "Pilih bulan dan tahun spesifik pada filter terlebih dahulu untuk menyetujui semua draf."
      );
      return;
    }
    setIsApproveAllOpen(true);
  };

  const confirmApproveAll = async () => {
    setIsApprovingAll(true);
    try {
      const payload: Record<string, unknown> = {
        month: Number(selectedMonth),
        year: Number(selectedYear),
      };
      if (selectedDept !== "all") payload.departmentId = selectedDept;

      const { data: res } = await axios.post("/api/payroll/approve-all", payload);
      const count: number = res.data?.approvedCount ?? 0;
      if (count === 0) {
        toast.info("Tidak ada gaji berstatus Draf pada periode ini.");
      } else {
        toast.success(`${count} gaji berhasil disetujui.`);
      }
      setIsApproveAllOpen(false);
      fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Gagal menyetujui semua gaji"));
    } finally {
      setIsApprovingAll(false);
    }
  };

  const deleteConfirm = useDeleteConfirm<PayrollItem>(async (row) => {
    try {
      await axios.delete(`/api/payroll/${row.id}`);
      toast.success("Data penggajian berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Gagal menghapus data"));
      throw error;
    }
  });

  // ─── Columns ─────────────────────────────────────────────
  const columns: Column<PayrollItem>[] = [
    {
      key: "employee",
      header: "Karyawan",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold text-foreground">
            {row.employee.fullName}
          </span>
          <span className="block max-w-[170px] truncate text-xs text-muted-foreground md:max-w-none">
            {row.employee.code} • {row.employee.department.name} ({row.employee.position.name})
          </span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Periode",
      className: "hidden sm:table-cell",
      render: (row) => (
        <span className="text-sm font-medium">
          {MONTH_NAMES[row.month - 1]} {row.year}
        </span>
      ),
    },
    {
      key: "basicSalary",
      header: "Gaji Pokok",
      className: "hidden lg:table-cell",
      render: (row) => formatCurrency(row.basicSalary),
    },
    {
      key: "allowanceTotal",
      header: "Tunjangan",
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="text-emerald-600 font-medium dark:text-emerald-400">
          +{formatCurrency(row.allowanceTotal)}
        </span>
      ),
    },
    {
      key: "deductionTotal",
      header: "Potongan",
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="text-rose-600 font-medium dark:text-rose-400">
          -{formatCurrency(row.deductionTotal)}
        </span>
      ),
    },
    {
      key: "overtimePay",
      header: "Lembur / Bonus",
      className: "hidden lg:table-cell",
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

        return (
          <Badge className={colorClasses}>
            {PAYROLL_STATUS_LABELS[row.status] || row.status}
          </Badge>
        );
      },
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted max-sm:h-10 max-sm:w-10">
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
                onClick={() => setStatusChange({ row, next: "APPROVED" })}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                Setujui (Approved)
              </DropdownMenuItem>
            )}

            {row.status === "APPROVED" && (
              <>
                <DropdownMenuItem
                  onClick={() => setStatusChange({ row, next: "PAID" })}
                >
                  <Wallet className="mr-2 h-4 w-4 text-emerald-600" />
                  Tandai Dibayar (Paid)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusChange({ row, next: "DRAFT" })}
                >
                  <RefreshCcw className="mr-2 h-4 w-4 text-amber-600" />
                  Kembalikan ke Draft
                </DropdownMenuItem>
              </>
            )}

            {row.status === "DRAFT" && (
              <DropdownMenuItem
                onClick={() => deleteConfirm.request(row)}
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
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={requestApproveAll}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Setujui Semua Draf
          </Button>
          <Button onClick={() => setIsGenerateOpen(true)} className="gap-2">
            <Calculator className="h-4 w-4" />
            Generate Gaji
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Total Gaji Bersih"
          value={formatCurrency(summary.totalNetSalary)}
        />
        <StatCard
          icon={DollarSign}
          label="Total Tunjangan"
          value={formatCurrency(summary.totalAllowance)}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          icon={Receipt}
          label="Total Potongan"
          value={formatCurrency(summary.totalDeduction)}
          iconClassName="bg-rose-500/10 text-rose-600"
        />
        <StatCard
          icon={RefreshCcw}
          label="Total Lembur + Bonus"
          value={formatCurrency(summary.totalOvertimePay + summary.totalBonus)}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground font-medium sm:col-span-1 sm:mr-2">
              <Filter className="h-4 w-4" /> Filter:
            </div>

            {/* Month Filter */}
            <div className="w-full sm:w-36">
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
            <div className="w-full sm:w-28">
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
                  {getYearOptions().map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-36">
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
            <div className="col-span-2 w-full sm:col-span-1 sm:w-44">
              <Select
                value={selectedDept}
                onValueChange={(val) => {
                  if (val) setSelectedDept(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departemen">
                    {(val: string) => val === "all" ? "Semua Departemen" : (departments.find((d) => d.id === val)?.name || val)}
                  </SelectValue>
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
              className="col-span-2 gap-2 sm:col-span-1 sm:ml-auto"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    {getYearOptions().map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.formState.errors.month || form.formState.errors.year) && (
              <p className="text-xs text-destructive">
                {form.formState.errors.month?.message ||
                  form.formState.errors.year?.message}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="departmentId">Departemen (Opsional)</Label>
              <Select
                value={form.watch("departmentId") || "all"}
                onValueChange={(val) => {
                  if (val) form.setValue("departmentId", val);
                }}
              >
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Semua Departemen">
                    {(val: string) => val === "all" ? "Semua Departemen (Semua Karyawan)" : (departments.find((d) => d.id === val)?.name || val)}
                  </SelectValue>
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
              <MoneyInput
                id="bonus"
                placeholder="0"
                {...form.register("bonus")}
              />
              {form.formState.errors.bonus && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.bonus.message}
                </p>
              )}
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

      {/* Generate Result Dialog */}
      <Dialog
        open={generateResult !== null}
        onOpenChange={(open) => {
          if (!open) setGenerateResult(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Hasil Generate Penggajian</DialogTitle>
            <DialogDescription>
              Ringkasan proses generate gaji massal.
            </DialogDescription>
          </DialogHeader>
          {generateResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                <div className="rounded-lg border p-2 sm:p-3">
                  <p className="text-xl font-bold sm:text-2xl">{generateResult.totalEmployees}</p>
                  <p className="text-xs text-muted-foreground">Total Karyawan</p>
                </div>
                <div className="rounded-lg border p-2 sm:p-3">
                  <p className="text-xl font-bold text-emerald-600 sm:text-2xl">
                    {generateResult.processedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Diproses</p>
                </div>
                <div className="rounded-lg border p-2 sm:p-3">
                  <p className="text-xl font-bold text-amber-600 sm:text-2xl">
                    {generateResult.skippedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Dilewati</p>
                </div>
              </div>

              {generateResult.errors && generateResult.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="mb-2 text-sm font-semibold text-destructive">
                    Rincian karyawan yang dilewati:
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {generateResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGenerateResult(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve All Confirm Dialog */}
      <ConfirmDialog
        open={isApproveAllOpen}
        onOpenChange={setIsApproveAllOpen}
        onConfirm={confirmApproveAll}
        isLoading={isApprovingAll}
        title="Setujui Semua Draf"
        description={
          selectedMonth !== "all" && selectedYear !== "all"
            ? `Semua gaji berstatus Draf periode ${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}${
                selectedDept !== "all"
                  ? ` di departemen ${departments.find((d) => d.id === selectedDept)?.name || "terpilih"}`
                  : ""
              } akan diubah menjadi Disetujui. Slip yang sudah Disetujui/Dibayar tidak terpengaruh.`
            : ""
        }
        confirmLabel="Setujui Semua"
        cancelLabel="Batal"
      />

      {/* Status Change Confirm Dialog */}
      <ConfirmDialog
        open={statusChange !== null}
        onOpenChange={(open) => {
          if (!open) setStatusChange(null);
        }}
        onConfirm={confirmStatusChange}
        title={statusChange ? STATUS_CHANGE_COPY[statusChange.next].title : ""}
        description={
          statusChange
            ? `${statusChange.row.employee.fullName} — ${MONTH_NAMES[statusChange.row.month - 1]} ${statusChange.row.year} — Gaji bersih ${formatCurrency(statusChange.row.netSalary)}.${
                statusChange.next === "PAID"
                  ? " Setelah ditandai DIBAYAR, status tidak dapat diubah lagi."
                  : ""
              }`
            : ""
        }
        confirmLabel={
          statusChange ? STATUS_CHANGE_COPY[statusChange.next].label : "Lanjutkan"
        }
        cancelLabel="Batal"
        variant={statusChange ? STATUS_CHANGE_COPY[statusChange.next].variant : "default"}
        isLoading={isChangingStatus}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={deleteConfirm.setOpen}
        onConfirm={deleteConfirm.confirm}
        isLoading={deleteConfirm.isDeleting}
        title="Hapus Draft Gaji"
        description={
          deleteConfirm.item
            ? `Hapus draft gaji ${deleteConfirm.item.employee.fullName} periode ${MONTH_NAMES[deleteConfirm.item.month - 1]} ${deleteConfirm.item.year}? Anda dapat meng-generate ulang gaji ini kapan saja.`
            : "Apakah Anda yakin ingin menghapus data penggajian DRAFT ini?"
        }
        confirmLabel="Hapus Draft"
        cancelLabel="Batal"
      />
    </div>
  );
}
