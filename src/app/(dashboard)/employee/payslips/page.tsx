"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  Printer,
  Eye,
  Building2,
  UserCheck,
  Calendar,
  CheckCircle2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { formatCurrency, formatDate } from "@/src/utils/format";

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

interface PayrollDetailItem {
  id: string;
  component: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
  description: string | null;
}

interface Payslip {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  allowanceTotal: number;
  deductionTotal: number;
  overtimePay: number;
  bonus: number;
  netSalary: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  createdAt: string;
  employee: {
    code: string;
    fullName: string;
    email: string;
    department: { name: string };
    position: { name: string };
  };
  details: PayrollDetailItem[];
}

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchPayslips = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: res } = await axios.get("/api/employee/payslips");
      if (res.success && res.data) {
        setPayslips(res.data || []);
      }
    } catch {
      toast.error("Gagal mengambil data slip gaji");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const handleOpenDetail = (p: Payslip) => {
    setSelectedPayslip(p);
    setIsDialogOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Slip Gaji Saya
        </h2>
        <p className="text-muted-foreground">
          Daftar slip gaji resmi yang telah disetujui dan dibayarkan oleh perusahaan.
        </p>
      </div>

      {/* Payslips Card List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Riwayat Penggajian Bulanan</CardTitle>
          <CardDescription>
            Klik &quot;Lihat Slip Gaji&quot; untuk melihat rincian pendapatan, potongan, dan mencetak dokumen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Memuat data slip gaji...
            </div>
          ) : payslips.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Belum ada slip gaji yang disetujui untuk akun Anda.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Total Tunjangan</TableHead>
                    <TableHead>Total Potongan</TableHead>
                    <TableHead>Gaji Bersih (Take Home Pay)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">
                        {MONTH_NAMES[p.month - 1]} {p.year}
                      </TableCell>
                      <TableCell>{formatCurrency(p.basicSalary)}</TableCell>
                      <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium">
                        + {formatCurrency(p.allowanceTotal + p.overtimePay + p.bonus)}
                      </TableCell>
                      <TableCell className="text-destructive font-medium">
                        - {formatCurrency(p.deductionTotal)}
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                        {formatCurrency(p.netSalary)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "PAID" ? "default" : "secondary"}>
                          {p.status === "PAID" ? "Lunas (Dibayar)" : "Disetujui"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(p)}
                          className="gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Lihat Slip
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail & Printable Payslip Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg">Detail Slip Gaji Karyawan</DialogTitle>
                <DialogDescription>
                  Periode {selectedPayslip && `${MONTH_NAMES[selectedPayslip.month - 1]} ${selectedPayslip.year}`}
                </DialogDescription>
              </div>
              <Button size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Cetak / Download PDF
              </Button>
            </div>
          </DialogHeader>

          {selectedPayslip && (
            <div ref={printRef} className="space-y-6 pt-2 text-foreground print:p-6 print:text-black">
              {/* Slip Header / Company Info */}
              <div className="border-b pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">SLIP GAJI KARYAWAN</h3>
                  <p className="text-xs text-muted-foreground">
                    Periode: <strong className="text-foreground">{MONTH_NAMES[selectedPayslip.month - 1]} {selectedPayslip.year}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs font-semibold">
                    STATUS: {selectedPayslip.status}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Dibuat: {formatDate(selectedPayslip.createdAt)}
                  </p>
                </div>
              </div>

              {/* Employee Info Grid */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">NIK / Kode:</span>{" "}
                    <strong className="font-mono">{selectedPayslip.employee.code}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nama Karyawan:</span>{" "}
                    <strong>{selectedPayslip.employee.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {selectedPayslip.employee.email}
                  </div>
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">Departemen:</span>{" "}
                    <strong>{selectedPayslip.employee.department.name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Jabatan:</span>{" "}
                    <strong>{selectedPayslip.employee.position.name}</strong>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Details Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rincian Komponen Gaji
                </h4>
                <div className="rounded-lg border overflow-hidden text-xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Komponen</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Jumlah (Rp)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPayslip.details.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.component}
                            {item.description && (
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {item.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-semibold ${
                                item.type === "EARNING"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-destructive"
                              }`}
                            >
                              {item.type === "EARNING" ? "Pendapatan (+)" : "Potongan (-)"}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              item.type === "EARNING"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                            }`}
                          >
                            {item.type === "EARNING" ? "+" : "-"} {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary Take-Home Pay Box */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">TOTAL PENDAPATAN BERSIH</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">Gaji Bersih (Take Home Pay)</div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(selectedPayslip.netSalary)}
                </div>
              </div>

              {/* Print Footer Notice */}
              <div className="text-[11px] text-center text-muted-foreground pt-4 border-t border-dashed">
                Dokumen ini diterbitkan secara otomatis oleh Payroll System dan sah tanpa tanda tangan basah.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
