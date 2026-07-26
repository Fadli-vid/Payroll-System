"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/src/utils/format";
import { MONTH_NAMES, PAYROLL_STATUS_LABELS } from "@/src/lib/constants";
import { apiErrorMessage } from "@/src/lib/api-client";
import axios from "axios";
import { toast } from "sonner";

import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import { ConfirmDialog } from "@/src/components/layout/confirm-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Printer,
  RefreshCcw,
  Wallet,
} from "lucide-react";

interface PayrollDetailData {
  id: string;
  component: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
  description?: string;
}

interface PayrollData {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowanceTotal: number;
  deductionTotal: number;
  overtimePay: number;
  bonus: number;
  netSalary: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  isStale?: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    code: string;
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    hireDate: string;
    department: {
      id: string;
      name: string;
    };
    position: {
      id: string;
      name: string;
    };
  };
  details: PayrollDetailData[];
}

export default function SalarySlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusChange, setStatusChange] = useState<"DRAFT" | "APPROVED" | "PAID" | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  useEffect(() => {
    async function loadPayroll() {
      setIsLoading(true);
      try {
        const { data: res } = await axios.get(`/api/payroll/${id}`);
        setPayroll(res.data);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Gagal memuat slip gaji"));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPayroll();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const confirmStatusChange = async () => {
    if (!statusChange) return;
    setIsChangingStatus(true);
    try {
      await axios.patch(`/api/payroll/${id}`, { status: statusChange });
      toast.success(
        `Status slip gaji diperbarui menjadi ${PAYROLL_STATUS_LABELS[statusChange]}`
      );
      setPayroll((prev) => (prev ? { ...prev, status: statusChange } : null));
      setStatusChange(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Gagal memperbarui status"));
    } finally {
      setIsChangingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Memuat slip gaji...</p>
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive font-semibold">
          Slip gaji tidak ditemukan atau telah dihapus.
        </p>
        <Button variant="outline" onClick={() => router.push("/payroll")}>
          Kembali ke Daftar Penggajian
        </Button>
      </div>
    );
  }

  const earnings = payroll.details.filter((d) => d.type === "EARNING");
  const deductions = payroll.details.filter((d) => d.type === "DEDUCTION");

  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDeductions = deductions.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/payroll")}
          className="gap-2 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {payroll.status === "DRAFT" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusChange("APPROVED")}
              className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:text-blue-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Setujui
            </Button>
          )}

          {payroll.status === "APPROVED" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusChange("PAID")}
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
              >
                <Wallet className="h-4 w-4" />
                Tandai Dibayar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusChange("DRAFT")}
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-400"
              >
                <RefreshCcw className="h-4 w-4" />
                Kembalikan ke Draft
              </Button>
            </>
          )}

          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak / Export PDF
          </Button>
        </div>
      </div>

      {/* Stale warning */}
      {payroll.status === "DRAFT" && payroll.isStale && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 print:hidden">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            Data kehadiran periode ini berubah setelah slip di-generate — angka
            pada slip mungkin sudah tidak akurat. Silakan generate ulang gaji
            periode ini.
          </span>
        </div>
      )}

      {/* Official Salary Slip Card / Print Container */}
      <Card className="print-area shadow-lg border border-border bg-card print:shadow-none print:border-none print:m-0">
        <CardContent className="p-4 sm:p-10 space-y-8 print:p-0 print:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6 border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground print:bg-black print:text-white">
                <CircleDollarSign className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight sm:text-xl print:text-xl">
                  PT. PAYROLL SYSTEM INDONESIA
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gedung Payroll Center Lt. 8, Jl. Jend. Sudirman No. 45, Jakarta Selatan
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-lg font-bold tracking-tight text-primary print:text-black">
                SLIP GAJI KARYAWAN
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Periode: {MONTH_NAMES[payroll.month - 1]} {payroll.year}
              </p>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={
                    payroll.status === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 print:border-black"
                      : payroll.status === "APPROVED"
                      ? "bg-blue-50 text-blue-700 border-blue-300 print:border-black"
                      : "bg-amber-50 text-amber-700 border-amber-300 print:border-black"
                  }
                >
                  STATUS: {(PAYROLL_STATUS_LABELS[payroll.status] || payroll.status).toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Employee Information */}
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 print:bg-transparent print:border print:border-border text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">
                NIP / Kode Karyawan
              </span>
              <span className="font-semibold">{payroll.employee.code}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">
                Nama Karyawan
              </span>
              <span className="font-semibold">{payroll.employee.fullName}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">
                Departemen
              </span>
              <span className="font-semibold">
                {payroll.employee.department.name}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">
                Jabatan
              </span>
              <span className="font-semibold">
                {payroll.employee.position.name}
              </span>
            </div>
          </div>

          {/* Breakdown Tables (Earnings & Deductions side by side or stacked) */}
          <div className="grid md:grid-cols-2 gap-8 print:grid-cols-2">
            {/* Earnings Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 print:text-black">
                  PENERIMAAN (EARNINGS)
                </h3>
                <span className="text-xs text-muted-foreground">Jumlah (Rp)</span>
              </div>
              <div className="space-y-2 text-sm">
                {earnings.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start"
                  >
                    <div>
                      <span className="font-medium text-foreground">
                        {item.component}
                      </span>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between items-center font-bold text-sm pt-1">
                <span>Total Penerimaan</span>
                <span className="text-emerald-600 dark:text-emerald-400 print:text-black">
                  {formatCurrency(totalEarnings)}
                </span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400 print:text-black">
                  POTONGAN (DEDUCTIONS)
                </h3>
                <span className="text-xs text-muted-foreground">Jumlah (Rp)</span>
              </div>
              <div className="space-y-2 text-sm">
                {deductions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    Tidak ada potongan.
                  </p>
                ) : (
                  deductions.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start"
                    >
                      <div>
                        <span className="font-medium text-foreground">
                          {item.component}
                        </span>
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Separator />
              <div className="flex justify-between items-center font-bold text-sm pt-1">
                <span>Total Potongan</span>
                <span className="text-rose-600 dark:text-rose-400 print:text-black">
                  {formatCurrency(totalDeductions)}
                </span>
              </div>
            </div>
          </div>

          {/* Take Home Pay Callout */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:border-black print:bg-transparent">
            <div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Gaji Bersih Diterima (Take Home Pay)
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total Penerimaan ({formatCurrency(totalEarnings)}) - Total Potongan ({formatCurrency(totalDeductions)})
              </p>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary print:text-black">
              {formatCurrency(payroll.netSalary)}
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="pt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 print:grid-cols-2 text-center text-xs">
            <div className="space-y-12">
              <p className="text-muted-foreground">Penerima (Karyawan),</p>
              <div className="border-b border-dashed w-3/4 mx-auto border-muted-foreground"></div>
              <p className="font-semibold">{payroll.employee.fullName}</p>
            </div>
            <div className="space-y-12">
              <p className="text-muted-foreground">Manajer HRD / Keuangan,</p>
              <div className="border-b border-dashed w-3/4 mx-auto border-muted-foreground"></div>
              <p className="font-semibold">PT. Payroll System Indonesia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Change Confirm Dialog */}
      <ConfirmDialog
        open={statusChange !== null}
        onOpenChange={(open) => {
          if (!open) setStatusChange(null);
        }}
        onConfirm={confirmStatusChange}
        title={
          statusChange === "PAID"
            ? "Tandai Dibayar"
            : statusChange === "APPROVED"
            ? "Setujui Gaji"
            : "Kembalikan ke Draft"
        }
        description={`${payroll.employee.fullName} — ${MONTH_NAMES[payroll.month - 1]} ${payroll.year} — Gaji bersih ${formatCurrency(payroll.netSalary)}.${
          statusChange === "PAID"
            ? " Setelah ditandai DIBAYAR, status tidak dapat diubah lagi."
            : ""
        }`}
        confirmLabel={
          statusChange === "PAID"
            ? "Tandai Dibayar"
            : statusChange === "APPROVED"
            ? "Setujui"
            : "Kembalikan ke Draft"
        }
        cancelLabel="Batal"
        variant={statusChange === "DRAFT" ? "destructive" : "default"}
        isLoading={isChangingStatus}
      />
    </div>
  );
}
