"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  deductionSchema,
  DeductionFormValues,
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
import { Switch } from "@/src/components/ui/switch";
import { Badge } from "@/src/components/ui/badge";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

// Using extending interface for API response
interface Deduction extends DeductionFormValues {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export default function DeductionsPage() {
  // ─── State ───────────────────────────────────────────────
  const [data, setData] = useState<Deduction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Form ──────────────────────────────────────────────
  const form = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionSchema as any),
    defaultValues: {
      name: "",
      amount: 0,
      description: "",
      isActive: true,
    },
  });

  // ─── Data Fetching ───────────────────────────────────────
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
      const { data: response } = await axios.get<{
        data: Deduction[];
        meta: { total: number };
      }>("/api/deductions", { params });

      setData(response.data);
      setTotal(response.meta.total);
    } catch (error) {
      toast.error("Gagal mengambil data potongan");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handlers ────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingId(null);
    form.reset({ name: "", amount: 0, description: "", isActive: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (deduction: Deduction) => {
    setEditingId(deduction.id);
    form.reset({
      name: deduction.name,
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

  // ─── Columns ─────────────────────────────────────────────
  const columns: Column<Deduction>[] = [
    {
      key: "name",
      header: "Nama Potongan",
      sortable: true,
    },
    {
      key: "amount",
      header: "Jumlah (Rp)",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-destructive">
          {formatCurrency(row.amount)}
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

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Potongan</h2>
        <p className="text-muted-foreground">
          Kelola master data potongan (deduction) karyawan.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Daftar Potongan</CardTitle>
          <CardDescription>
            Potongan akan mengurangi total pendapatan karyawan setiap bulan.
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

      {/* Create / Edit Dialog */}
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
                placeholder="cth. Potongan Koperasi"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Jumlah (Rp) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount.message}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Hapus Potongan"
        description="Apakah Anda yakin ingin menghapus potongan ini? Data yang dihapus tidak dapat dikembalikan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
      />
    </div>
  );
}
