"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/src/components/layout/data-table";
import { ConfirmDialog } from "@/src/components/layout/confirm-dialog";
import { departmentSchema, type DepartmentFormValues } from "@/src/types";
import { formatDate } from "@/src/utils/format";

// ─── Types ───────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  description: string | null;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiListResponse {
  success: boolean;
  data: {
    data: Department[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

// ─── Page Component ──────────────────────────────────────

export default function DepartmentsPage() {
  // ─── State ─────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] =
    useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Form ──────────────────────────────────────────────

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema as any),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // ─── Fetch Data ────────────────────────────────────────

  const fetchDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);

      const res = await axios.get<ApiListResponse>(
        `/api/departments?${params.toString()}`
      );
      if (res.data.success) {
        setDepartments(res.data.data.data);
        setTotal(res.data.data.meta.total);
      }
    } catch {
      toast.error("Gagal memuat data departemen");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // ─── Handlers ──────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingDepartment(null);
    form.reset({ name: "", description: "" });
    setFormOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setEditingDepartment(dept);
    form.reset({
      name: dept.name,
      description: dept.description ?? "",
    });
    setFormOpen(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setDeletingDepartment(dept);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (values: DepartmentFormValues) => {
    try {
      setIsSubmitting(true);

      if (editingDepartment) {
        // Update
        await axios.put(`/api/departments/${editingDepartment.id}`, values);
        toast.success("Departemen berhasil diperbarui");
      } else {
        // Create
        await axios.post("/api/departments", values);
        toast.success("Departemen berhasil dibuat");
      }

      setFormOpen(false);
      form.reset();
      fetchDepartments();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data;
        if (data.errors) {
          // Set field-level errors from API
          for (const [field, messages] of Object.entries(data.errors)) {
            form.setError(field as keyof DepartmentFormValues, {
              message: (messages as string[])[0],
            });
          }
        } else {
          toast.error(data.message || "Terjadi kesalahan");
        }
      } else {
        toast.error("Terjadi kesalahan");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;
    try {
      setIsDeleting(true);
      await axios.delete(`/api/departments/${deletingDepartment.id}`);
      toast.success("Departemen berhasil dihapus");
      setDeleteDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        toast.error(error.response.data.message || "Gagal menghapus departemen");
      } else {
        toast.error("Gagal menghapus departemen");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Table Columns ────────────────────────────────────

  const columns: Column<Department>[] = [
    {
      key: "name",
      header: "Nama Departemen",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{row.name}</div>
            {row.description && (
              <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "employeeCount",
      header: "Karyawan",
      sortable: false,
      className: "w-[120px]",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge variant="secondary" className="text-xs">
            {row.employeeCount}
          </Badge>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Dibuat",
      sortable: true,
      className: "w-[160px]",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[70px]",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
          >
            <span className="sr-only">Menu</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(row)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => openDeleteDialog(row)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Departemen</h2>
        <p className="text-muted-foreground">
          Kelola data departemen perusahaan Anda.
        </p>
      </div>

      {/* Data Table Card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Daftar Departemen</CardTitle>
            <span className="text-sm text-muted-foreground">
              {total} departemen
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <DataTable<Department>
            columns={columns}
            data={departments}
            total={total}
            page={page}
            pageSize={pageSize}
            search={search}
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
            searchPlaceholder="Cari departemen..."
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
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Edit Departemen" : "Tambah Departemen"}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? "Perbarui informasi departemen."
                : "Buat departemen baru untuk perusahaan Anda."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Departemen <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="cth. Teknologi Informasi"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                placeholder="Deskripsi singkat (opsional)"
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Menyimpan..."
                  : editingDepartment
                  ? "Simpan Perubahan"
                  : "Buat Departemen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Departemen"
        description={`Apakah Anda yakin ingin menghapus departemen "${deletingDepartment?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
