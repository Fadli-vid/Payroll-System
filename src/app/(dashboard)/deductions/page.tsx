"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  deductionSchema,
  DeductionFormValues,
  penaltySettingSchema,
  PenaltySettingFormValues,
  ListQueryParams,
} from "@/src/types";
import { formatCurrency, formatDate } from "@/src/utils/format";
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
import { Textarea } from "@/src/components/ui/textarea";
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
import { Switch } from "@/src/components/ui/switch";
import { Badge } from "@/src/components/ui/badge";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface Deduction extends DeductionFormValues {
  id: string;
  type: "FIXED" | "PERCENTAGE";
  createdAt: string;
  updatedAt: string;
}

interface PenaltySetting {
  id: string;
  type: "LATE" | "ABSENT";
  mode: "FIXED" | "PERCENTAGE";
  value: number;
  minMinutes: number;
  maxMinutes: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────

const PENALTY_TYPE_LABELS: Record<string, string> = {
  LATE: "Terlambat",
  ABSENT: "Tidak Hadir",
};

const PENALTY_MODE_LABELS: Record<string, string> = {
  FIXED: "Nominal Tetap (Rp)",
  PERCENTAGE: "Persentase Gaji (%)",
};

// ─── Page Component ──────────────────────────────────────

export default function DeductionsPage() {
  // ═══ DEDUCTION STATE ═══════════════════════════════════
  const [data, setData] = useState<Deduction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ═══ PENALTY STATE ═════════════════════════════════════
  const [penalties, setPenalties] = useState<PenaltySetting[]>([]);
  const [isPenaltyLoading, setIsPenaltyLoading] = useState(true);
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState<PenaltySetting | null>(null);
  const [deletePenaltyOpen, setDeletePenaltyOpen] = useState(false);
  const [deletingPenaltyId, setDeletingPenaltyId] = useState<string | null>(null);

  // ═══ DEDUCTION FORM ════════════════════════════════════
  const form = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionSchema as any),
    defaultValues: {
      name: "",
      type: "FIXED",
      amount: 0,
      description: "",
      isActive: true,
    },
  });

  // ═══ PENALTY FORM ══════════════════════════════════════
  const penaltyForm = useForm<PenaltySettingFormValues>({
    resolver: zodResolver(penaltySettingSchema as any),
    defaultValues: {
      type: "LATE",
      mode: "FIXED",
      value: 0,
      minMinutes: 0,
      maxMinutes: null,
      description: "",
      isActive: true,
    },
  });

  const watchDeductionType = form.watch("type");
  const watchPenaltyType = penaltyForm.watch("type");
  const watchPenaltyMode = penaltyForm.watch("mode");

  // ═══ DATA FETCHING ═════════════════════════════════════

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: ListQueryParams = {
        page,
        pageSize,
        search,
        sortBy,
        sortOrder,
      };
      const { data: response } = await axios.get("/api/deductions", { params });

      const result = response.data;
      setData(Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []);
      setTotal(result?.meta?.total || 0);
    } catch (error) {
      toast.error("Gagal mengambil data potongan");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder]);

  const fetchPenalties = useCallback(async () => {
    setIsPenaltyLoading(true);
    try {
      const { data: res } = await axios.get("/api/penalty-settings");
      const list = res.data;
      setPenalties(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Gagal memuat pengaturan penalti");
    } finally {
      setIsPenaltyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPenalties();
  }, [fetchPenalties]);

  // ═══ DEDUCTION HANDLERS ════════════════════════════════

  const openCreateDialog = () => {
    setEditingId(null);
    form.reset({ name: "", type: "FIXED", amount: 0, description: "", isActive: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (deduction: Deduction) => {
    setEditingId(deduction.id);
    form.reset({
      name: deduction.name,
      type: deduction.type || "FIXED",
      amount: deduction.amount,
      description: deduction.description || "",
      isActive: deduction.isActive,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (values: DeductionFormValues) => {
    try {
      if (editingId) {
        await axios.put(`/api/deductions/${editingId}`, values);
        toast.success("Potongan berhasil diperbarui");
      } else {
        await axios.post("/api/deductions", values);
        toast.success("Potongan berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Terjadi kesalahan saat menyimpan data"
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await axios.delete(`/api/deductions/${deletingId}`);
      toast.success("Potongan berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal menghapus potongan"
      );
    }
  };

  // ═══ PENALTY HANDLERS ══════════════════════════════════

  const openPenaltyCreate = () => {
    setEditingPenalty(null);
    penaltyForm.reset({
      type: "LATE",
      mode: "FIXED",
      value: 0,
      minMinutes: 0,
      maxMinutes: null,
      description: "",
      isActive: true,
    });
    setPenaltyDialogOpen(true);
  };

  const openPenaltyEdit = (p: PenaltySetting) => {
    setEditingPenalty(p);
    penaltyForm.reset({
      type: p.type,
      mode: p.mode,
      value: p.value,
      minMinutes: p.minMinutes,
      maxMinutes: p.maxMinutes,
      description: p.description || "",
      isActive: p.isActive,
    });
    setPenaltyDialogOpen(true);
  };

  const openPenaltyDelete = (id: string) => {
    setDeletingPenaltyId(id);
    setDeletePenaltyOpen(true);
  };

  const handlePenaltySubmit = async (values: PenaltySettingFormValues) => {
    try {
      if (editingPenalty) {
        await axios.put(`/api/penalty-settings/${editingPenalty.id}`, values);
        toast.success("Pengaturan penalti berhasil diperbarui");
      } else {
        await axios.post("/api/penalty-settings", values);
        toast.success("Pengaturan penalti berhasil ditambahkan");
      }
      setPenaltyDialogOpen(false);
      fetchPenalties();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal menyimpan pengaturan penalti"
      );
    }
  };

  const handlePenaltyDelete = async () => {
    if (!deletingPenaltyId) return;
    try {
      await axios.delete(`/api/penalty-settings/${deletingPenaltyId}`);
      toast.success("Pengaturan penalti berhasil dihapus");
      fetchPenalties();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal menghapus pengaturan penalti"
      );
    }
  };

  // ═══ DEDUCTION TABLE COLUMNS ═══════════════════════════

  const columns: Column<Deduction>[] = [
    {
      key: "name",
      header: "Nama Potongan",
      sortable: true,
    },
    {
      key: "type",
      header: "Tipe",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.type === "PERCENTAGE" ? "Persentase" : "Nominal Tetap"}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Jumlah / Nilai",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-destructive">
          {row.type === "PERCENTAGE" ? `${row.amount}%` : formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Aktif" : "Tidak Aktif"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Dibuat Pada",
      sortable: true,
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Buka menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openEditDialog(row)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDeleteDialog(row.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ═══ PENALTY HELPERS ═══════════════════════════════════

  const latePenalties = penalties.filter((p) => p.type === "LATE");
  const absentPenalties = penalties.filter((p) => p.type === "ABSENT");

  function formatPenaltyValue(p: PenaltySetting) {
    if (p.mode === "FIXED") return formatCurrency(p.value);
    return `${p.value}%`;
  }

  function formatRange(p: PenaltySetting) {
    if (p.maxMinutes === null || p.maxMinutes === undefined) {
      return `≥ ${p.minMinutes} menit`;
    }
    return `${p.minMinutes} – ${p.maxMinutes} menit`;
  }

  // ═══ RENDER ════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Potongan</h2>
        <p className="text-muted-foreground">
          Kelola master data potongan bulanan dan pengaturan penalti absensi.
        </p>
      </div>

      {/* ─── Monthly Deductions Table ─────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Daftar Potongan Bulanan</CardTitle>
          <CardDescription>
            Potongan rutin yang mengurangi total pendapatan karyawan setiap bulan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data}
            columns={columns}
            total={total}
            page={page}
            pageSize={pageSize}
            sortBy={sortBy}
            sortOrder={sortOrder}
            isLoading={isLoading}
            onPageChange={setPage}
            onSearchChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            onSortChange={(sb, so) => {
              setSortBy(sb);
              setSortOrder(so);
              setPage(1);
            }}
            searchPlaceholder="Cari potongan..."
            actions={
              <Button size="sm" onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* ─── Penalty Settings Card ────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Pengaturan Penalti Absensi
              </CardTitle>
              <CardDescription className="mt-1">
                Konfigurasi denda untuk keterlambatan dan ketidakhadiran tanpa izin.
                Potongan ini dihitung otomatis saat generate penggajian.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openPenaltyCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Penalti
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Late Penalty Section */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Penalti Keterlambatan (Tier)
            </h4>
            {isPenaltyLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Memuat...
              </div>
            ) : latePenalties.length === 0 ? (
              <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                Belum ada pengaturan penalti keterlambatan. Klik &quot;Tambah Penalti&quot; untuk menambahkan.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Range Keterlambatan</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Nilai Denda</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latePenalties.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{formatRange(p)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.mode === "FIXED" ? "Tetap" : "Persentase"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          {formatPenaltyValue(p)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">
                            {p.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-muted">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPenaltyEdit(p)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openPenaltyDelete(p.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Absent Penalty Section */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Penalti Tidak Hadir (Per Hari)
            </h4>
            {isPenaltyLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Memuat...
              </div>
            ) : absentPenalties.length === 0 ? (
              <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                Belum ada pengaturan penalti ketidakhadiran. Klik &quot;Tambah Penalti&quot; untuk menambahkan.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mode</TableHead>
                      <TableHead>Nilai Per Hari</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absentPenalties.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.mode === "FIXED" ? "Tetap" : "Persentase"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          {formatPenaltyValue(p)} / hari
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">
                            {p.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-muted">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPenaltyEdit(p)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openPenaltyDelete(p.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Info:</strong> Jika tidak ada pengaturan penalti, sistem menggunakan formula default
              (keterlambatan = tarif per-jam ÷ 60 × menit, absen = gaji pokok ÷ 22 × hari).
            </p>
            <p>
              Penalti terlambat dihitung <strong>per kejadian</strong> (setiap hari terlambat dicocokkan ke tier yang sesuai).
              Penalti absen dihitung <strong>per hari</strong> tidak hadir tanpa izin.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══ DEDUCTION CREATE/EDIT DIALOG ═══════════════════ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Potongan" : "Tambah Potongan"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Perbarui informasi potongan."
                : "Tambahkan potongan baru ke master data."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Potongan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="cth. Potongan Koperasi / Infaq"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Tipe Potongan <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchDeductionType}
                onValueChange={(val) => {
                  if (val) form.setValue("type", val as "FIXED" | "PERCENTAGE", { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(val: string) => val === "PERCENTAGE" ? "Persentase Gaji Pokok (%)" : "Nominal Tetap (Rp)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Nominal Tetap (Rp)</SelectItem>
                  <SelectItem value="PERCENTAGE">Persentase Gaji Pokok (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                {watchDeductionType === "PERCENTAGE" ? "Persentase Gaji Pokok (%)" : "Jumlah (Rp)"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step={watchDeductionType === "PERCENTAGE" ? "0.01" : "1"}
                placeholder={watchDeductionType === "PERCENTAGE" ? "cth. 2.5" : "0"}
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
              {watchDeductionType === "PERCENTAGE" && (
                <p className="text-xs text-muted-foreground">
                  Contoh: 2.5% dari gaji pokok setiap karyawan
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                placeholder="Penjelasan singkat mengenai potongan ini..."
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
              <Label htmlFor="isActive">Status Aktif</Label>
            </div>
            {form.formState.errors.isActive && (
              <p className="text-xs text-destructive">
                {form.formState.errors.isActive.message}
              </p>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ PENALTY CREATE/EDIT DIALOG ═════════════════════ */}
      <Dialog open={penaltyDialogOpen} onOpenChange={setPenaltyDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {editingPenalty ? "Edit Penalti" : "Tambah Penalti"}
            </DialogTitle>
            <DialogDescription>
              {editingPenalty
                ? "Perbarui pengaturan penalti absensi."
                : "Tambahkan pengaturan penalti baru untuk keterlambatan atau ketidakhadiran."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={penaltyForm.handleSubmit(handlePenaltySubmit)} className="space-y-4">
            {/* Type & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Tipe Penalti <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watchPenaltyType}
                  onValueChange={(val) => {
                    if (val) penaltyForm.setValue("type", val as "LATE" | "ABSENT", { shouldValidate: true });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(val: string) => PENALTY_TYPE_LABELS[val] || val}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LATE">Terlambat</SelectItem>
                    <SelectItem value="ABSENT">Tidak Hadir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Mode Penalti <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watchPenaltyMode}
                  onValueChange={(val) => {
                    if (val) penaltyForm.setValue("mode", val as "FIXED" | "PERCENTAGE", { shouldValidate: true });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(val: string) => PENALTY_MODE_LABELS[val] || val}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Nominal Tetap (Rp)</SelectItem>
                    <SelectItem value="PERCENTAGE">Persentase Gaji (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label htmlFor="penalty-value">
                {watchPenaltyMode === "FIXED" ? "Nilai Denda (Rp)" : "Persentase Gaji (%)"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="penalty-value"
                type="number"
                step={watchPenaltyMode === "PERCENTAGE" ? "0.01" : "1"}
                placeholder={watchPenaltyMode === "FIXED" ? "cth. 25000" : "cth. 4.55"}
                {...penaltyForm.register("value")}
              />
              {penaltyForm.formState.errors.value && (
                <p className="text-xs text-destructive">
                  {penaltyForm.formState.errors.value.message}
                </p>
              )}
              {watchPenaltyMode === "PERCENTAGE" && (
                <p className="text-xs text-muted-foreground">
                  Contoh: 4.55% ≈ 1/22 dari gaji pokok (potongan per-hari kerja)
                </p>
              )}
            </div>

            {/* Min/Max Minutes (only for LATE type) */}
            {watchPenaltyType === "LATE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minMinutes">Menit Minimum</Label>
                  <Input
                    id="minMinutes"
                    type="number"
                    placeholder="0"
                    {...penaltyForm.register("minMinutes")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Keterlambatan minimal untuk tier ini
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxMinutes">Menit Maksimum</Label>
                  <Input
                    id="maxMinutes"
                    type="number"
                    placeholder="Kosongkan = tak terbatas"
                    {...penaltyForm.register("maxMinutes")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kosongkan jika tidak ada batas atas
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="penalty-desc">Deskripsi (Opsional)</Label>
              <Input
                id="penalty-desc"
                placeholder="cth. Terlambat ringan, tanpa denda"
                {...penaltyForm.register("description")}
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center space-x-2 pt-1">
              <Switch
                id="penalty-active"
                checked={penaltyForm.watch("isActive")}
                onCheckedChange={(checked) => penaltyForm.setValue("isActive", checked)}
              />
              <Label htmlFor="penalty-active">Status Aktif</Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPenaltyDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={penaltyForm.formState.isSubmitting}
              >
                {penaltyForm.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE DIALOGS ═════════════════════════════════ */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Hapus Potongan"
        description="Apakah Anda yakin ingin menghapus potongan ini? Data yang dihapus tidak dapat dikembalikan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
      />

      <ConfirmDialog
        open={deletePenaltyOpen}
        onOpenChange={setDeletePenaltyOpen}
        onConfirm={handlePenaltyDelete}
        title="Hapus Pengaturan Penalti"
        description="Apakah Anda yakin ingin menghapus pengaturan penalti ini? Jika dihapus, sistem akan menggunakan formula default saat generate penggajian."
        confirmLabel="Hapus"
        cancelLabel="Batal"
      />
    </div>
  );
}
