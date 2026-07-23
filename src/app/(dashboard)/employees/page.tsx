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
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/src/components/layout/data-table";
import { ConfirmDialog } from "@/src/components/layout/confirm-dialog";
import { employeeSchema, type EmployeeFormValues } from "@/src/types";
import { formatDate, formatCurrency } from "@/src/utils/format";
import { EMPLOYMENT_STATUS_LABELS } from "@/src/lib/constants";

// ─── Types ───────────────────────────────────────────────

interface Employee {
  id: string;
  code: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  hireDate: string;
  status: string;
  baseSalary: number;
  departmentId: string;
  positionId: string;
  department: { id: string; name: string };
  position: { id: string; name: string };
  createdAt: string;
}

interface DeptOrPos {
  id: string;
  name: string;
}

// ─── Page Component ──────────────────────────────────────

export default function EmployeesPage() {
  // ─── State ─────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Lookups
  const [departments, setDepartments] = useState<DeptOrPos[]>([]);
  const [positions, setPositions] = useState<DeptOrPos[]>([]);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Form ──────────────────────────────────────────────

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema as any),
    defaultValues: {
      code: "",
      fullName: "",
      email: "",
      phone: "",
      address: "",
      hireDate: "",
      status: "ACTIVE",
      baseSalary: 0,
      departmentId: "",
      positionId: "",
    },
  });

  // ─── Fetch Lookups ─────────────────────────────────────

  useEffect(() => {
    async function fetchLookups() {
      try {
        const [deptRes, posRes] = await Promise.all([
          axios.get("/api/departments?pageSize=100&sortBy=name&sortOrder=asc"),
          axios.get("/api/positions?pageSize=100&sortBy=name&sortOrder=asc"),
        ]);
        if (deptRes.data.success) setDepartments(deptRes.data.data.data);
        if (posRes.data.success) setPositions(posRes.data.data.data);
      } catch {
        // Silently fail — dropdowns will just be empty
      }
    }
    fetchLookups();
  }, []);

  // ─── Fetch Employees ──────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await axios.get(`/api/employees?${params.toString()}`);
      if (res.data.success) {
        setEmployees(res.data.data.data);
        setTotal(res.data.data.meta.total);
      }
    } catch {
      toast.error("Gagal memuat data karyawan");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ─── Handlers ──────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingEmployee(null);
    form.reset({
      code: "",
      fullName: "",
      email: "",
      phone: "",
      address: "",
      hireDate: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      baseSalary: 0,
      departmentId: "",
      positionId: "",
    });
    setFormOpen(true);
  };

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    form.reset({
      code: emp.code,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone ?? "",
      address: emp.address ?? "",
      hireDate: emp.hireDate.split("T")[0],
      status: emp.status as EmployeeFormValues["status"],
      baseSalary: emp.baseSalary,
      departmentId: emp.departmentId,
      positionId: emp.positionId,
    });
    setFormOpen(true);
  };

  const openDeleteDialog = (emp: Employee) => {
    setDeletingEmployee(emp);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (values: EmployeeFormValues) => {
    try {
      setIsSubmitting(true);

      if (editingEmployee) {
        await axios.put(`/api/employees/${editingEmployee.id}`, values);
        toast.success("Karyawan berhasil diperbarui");
      } else {
        await axios.post("/api/employees", values);
        toast.success("Karyawan berhasil ditambahkan");
      }

      setFormOpen(false);
      form.reset();
      fetchEmployees();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data;
        if (data.errors) {
          for (const [field, messages] of Object.entries(data.errors)) {
            form.setError(field as keyof EmployeeFormValues, {
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
    if (!deletingEmployee) return;
    try {
      setIsDeleting(true);
      await axios.delete(`/api/employees/${deletingEmployee.id}`);
      toast.success("Karyawan berhasil dihapus");
      setDeleteDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        toast.error(error.response.data.message || "Gagal menghapus karyawan");
      } else {
        toast.error("Gagal menghapus karyawan");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Status Badge Variant ─────────────────────────────

  function getStatusVariant(status: string) {
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

  // ─── Table Columns ────────────────────────────────────

  const columns: Column<Employee>[] = [
    {
      key: "fullName",
      header: "Karyawan",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {row.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium">{row.fullName}</div>
            <div className="text-xs text-muted-foreground">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      className: "hidden md:table-cell",
      render: (row) => (
        <span className="text-sm">{row.email}</span>
      ),
    },
    {
      key: "department",
      header: "Departemen",
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="text-sm">{row.department.name}</span>
      ),
    },
    {
      key: "position",
      header: "Jabatan",
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="text-sm">{row.position.name}</span>
      ),
    },
    {
      key: "baseSalary",
      header: "Gaji Pokok",
      sortable: true,
      className: "hidden xl:table-cell",
      render: (row) => (
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.baseSalary)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-[120px]",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)} className="text-xs">
          {EMPLOYMENT_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
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
        <h2 className="text-2xl font-bold tracking-tight">Karyawan</h2>
        <p className="text-muted-foreground">
          Kelola data karyawan perusahaan Anda.
        </p>
      </div>

      {/* Data Table Card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Daftar Karyawan
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {total} karyawan
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Status filter bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { value: "", label: "Semua" },
              { value: "ACTIVE", label: "Aktif" },
              { value: "INACTIVE", label: "Tidak Aktif" },
              { value: "RESIGNED", label: "Mengundurkan Diri" },
              { value: "TERMINATED", label: "Diberhentikan" },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPage(1);
                }}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <DataTable<Employee>
            columns={columns}
            data={employees}
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
            searchPlaceholder="Cari karyawan..."
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Karyawan" : "Tambah Karyawan"}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? "Perbarui informasi karyawan."
                : "Tambahkan karyawan baru ke perusahaan Anda."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Row 1: Code + Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Kode Karyawan <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="cth. EMP-001"
                  {...form.register("code")}
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="cth. John Doe"
                  {...form.register("fullName")}
                />
                {form.formState.errors.fullName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@perusahaan.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  placeholder="cth. 08123456789"
                  {...form.register("phone")}
                />
              </div>
            </div>

            {/* Row 3: Department + Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Departemen <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("departmentId")}
                  onValueChange={(val) => { if (val) form.setValue("departmentId", val, { shouldValidate: true }) }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih departemen">
                      {(val: string) => departments.find((d) => d.id === val)?.name || val}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.departmentId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.departmentId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Jabatan <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("positionId")}
                  onValueChange={(val) => { if (val) form.setValue("positionId", val, { shouldValidate: true }) }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jabatan">
                      {(val: string) => positions.find((p) => p.id === val)?.name || val}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.positionId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.positionId.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 4: Hire Date + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hireDate">
                  Tanggal Masuk <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hireDate"
                  type="date"
                  {...form.register("hireDate")}
                />
                {form.formState.errors.hireDate && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.hireDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(val) => {
                    if (val) {
                      form.setValue("status", val as EmployeeFormValues["status"], {
                        shouldValidate: true,
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status">
                      {(val: string) => EMPLOYMENT_STATUS_LABELS[val as keyof typeof EMPLOYMENT_STATUS_LABELS] || val}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMPLOYMENT_STATUS_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.status && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.status.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 5: Base Salary */}
            <div className="space-y-2">
              <Label htmlFor="baseSalary">
                Gaji Pokok (Rp) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="baseSalary"
                type="number"
                min={0}
                placeholder="0"
                {...form.register("baseSalary")}
              />
              {form.formState.errors.baseSalary && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.baseSalary.message}
                </p>
              )}
            </div>

            {/* Row 6: Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                placeholder="Alamat lengkap (opsional)"
                {...form.register("address")}
              />
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
                  : editingEmployee
                  ? "Simpan Perubahan"
                  : "Tambah Karyawan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Karyawan"
        description={`Apakah Anda yakin ingin menghapus karyawan "${deletingEmployee?.fullName}" (${deletingEmployee?.code})? Data kehadiran terkait juga akan dihapus.`}
        confirmLabel="Ya, Hapus"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
