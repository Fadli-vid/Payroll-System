"use client";

import { useEffect, useState, useCallback, memo } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarCheck,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
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
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { DataTable, type Column } from "@/src/components/layout/data-table";
import { ConfirmDialog } from "@/src/components/layout/confirm-dialog";
import { attendanceSchema, type AttendanceFormValues } from "@/src/types";
import { ATTENDANCE_STATUS_LABELS } from "@/src/lib/constants";
import { formatTimeUTC, todayLocalISO } from "@/src/utils/format";
import { getAttendanceStatusVariant } from "@/src/utils/status";
import { fetchAllPages, apiErrorMessage } from "@/src/lib/api-client";

// ─── Bulk Attendance Types ────────────────────────────────

interface BulkEntry {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string;
}

// ─── Types ───────────────────────────────────────────────

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  overtimeHours: number;
  workingHours: number;
  notes: string | null;
  employee: { id: string; code: string; fullName: string };
  createdAt: string;
}

interface EmployeeLookup {
  id: string;
  code: string;
  fullName: string;
}

// ─── Helpers ─────────────────────────────────────────────

// Tanggal attendance disimpan UTC midnight — render dengan timeZone UTC
// agar tidak bergeser hari di timezone mana pun.
function formatDateWithDay(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── Bulk Entry Row (memoized — mencegah 100+ baris re-render per ketikan) ──

const BulkEntryRow = memo(function BulkEntryRow({
  entry,
  index,
  onChange,
}: {
  entry: BulkEntry;
  index: number;
  onChange: (index: number, field: keyof BulkEntry, value: string) => void;
}) {
  const timeDisabled = !["PRESENT", "LATE"].includes(entry.status);
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium text-sm">{entry.employeeName}</div>
          <div className="text-xs text-muted-foreground">{entry.employeeCode}</div>
        </div>
      </TableCell>
      <TableCell>
        <Input
          type="time"
          value={entry.checkIn}
          onChange={(e) => onChange(index, "checkIn", e.target.value)}
          className="h-8 text-sm"
          disabled={timeDisabled}
          aria-label={`Jam masuk ${entry.employeeName}`}
        />
      </TableCell>
      <TableCell>
        <Input
          type="time"
          value={entry.checkOut}
          onChange={(e) => onChange(index, "checkOut", e.target.value)}
          className="h-8 text-sm"
          disabled={timeDisabled}
          aria-label={`Jam keluar ${entry.employeeName}`}
        />
      </TableCell>
      <TableCell>
        <Select
          value={entry.status}
          onValueChange={(val) => {
            if (val) onChange(index, "status", val);
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {(val: string) => ATTENDANCE_STATUS_LABELS[val] || val}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={entry.notes}
          onChange={(e) => onChange(index, "notes", e.target.value)}
          placeholder="—"
          className="h-8 text-sm"
          aria-label={`Catatan ${entry.employeeName}`}
        />
      </TableCell>
    </TableRow>
  );
});

// ─── Bulk Entry Card (varian mobile <sm — state & callback sama dengan row) ──

const BulkEntryCard = memo(function BulkEntryCard({
  entry,
  index,
  onChange,
}: {
  entry: BulkEntry;
  index: number;
  onChange: (index: number, field: keyof BulkEntry, value: string) => void;
}) {
  const timeDisabled = !["PRESENT", "LATE"].includes(entry.status);
  return (
    <div className="space-y-2 border-b p-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{entry.employeeName}</div>
          <div className="text-xs text-muted-foreground">{entry.employeeCode}</div>
        </div>
        <Select
          value={entry.status}
          onValueChange={(val) => {
            if (val) onChange(index, "status", val);
          }}
        >
          <SelectTrigger className="h-9 w-36 shrink-0 text-sm">
            <SelectValue>
              {(val: string) => ATTENDANCE_STATUS_LABELS[val] || val}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-muted-foreground">Jam Masuk</span>
          <Input
            type="time"
            value={entry.checkIn}
            onChange={(e) => onChange(index, "checkIn", e.target.value)}
            disabled={timeDisabled}
            aria-label={`Jam masuk ${entry.employeeName}`}
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-muted-foreground">Jam Keluar</span>
          <Input
            type="time"
            value={entry.checkOut}
            onChange={(e) => onChange(index, "checkOut", e.target.value)}
            disabled={timeDisabled}
            aria-label={`Jam keluar ${entry.employeeName}`}
            className="text-sm"
          />
        </div>
      </div>
      <Input
        value={entry.notes}
        onChange={(e) => onChange(index, "notes", e.target.value)}
        placeholder="Catatan (opsional)"
        aria-label={`Catatan ${entry.employeeName}`}
        className="text-sm"
      />
    </div>
  );
});

// ─── Page Component ──────────────────────────────────────

export default function AttendancePage() {
  // ─── State ─────────────────────────────────────────────
  const [records, setRecords] = useState<Attendance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Lookups
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [employeeTotal, setEmployeeTotal] = useState(0);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<Attendance | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk attendance state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(todayLocalISO());
  const [bulkEntries, setBulkEntries] = useState<BulkEntry[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // ─── Form ──────────────────────────────────────────────

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema as any),
    defaultValues: {
      employeeId: "",
      date: "",
      status: "PRESENT",
      checkIn: "",
      checkOut: "",
      notes: "",
    },
  });

  // ─── Fetch Lookups ─────────────────────────────────────

  useEffect(() => {
    async function fetchEmployees() {
      try {
        // Ambil SEMUA halaman — API membatasi pageSize 100 per permintaan
        const { items, total } = await fetchAllPages<EmployeeLookup>(
          "/api/employees",
          { sortBy: "fullName", sortOrder: "asc", status: "ACTIVE" }
        );
        setEmployees(
          items.map((e) => ({ id: e.id, code: e.code, fullName: e.fullName }))
        );
        setEmployeeTotal(total);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Gagal memuat daftar karyawan"));
      }
    }
    fetchEmployees();
  }, []);

  // ─── Fetch Attendance ─────────────────────────────────

  const fetchRecords = useCallback(async () => {
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
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await axios.get(`/api/attendance?${params.toString()}`);
      if (res.data.success) {
        setRecords(res.data.data.data);
        setTotal(res.data.data.meta.total);
      }
    } catch {
      toast.error("Gagal memuat data kehadiran");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ─── Handlers ──────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingRecord(null);
    form.reset({
      employeeId: "",
      date: todayLocalISO(),
      status: "PRESENT",
      checkIn: "08:00",
      checkOut: "17:00",
      notes: "",
    });
    setFormOpen(true);
  };

  const openEditDialog = (rec: Attendance) => {
    setEditingRecord(rec);
    form.reset({
      employeeId: rec.employeeId,
      date: rec.date.split("T")[0],
      status: rec.status as AttendanceFormValues["status"],
      checkIn: formatTimeUTC(rec.checkIn, ""),
      checkOut: formatTimeUTC(rec.checkOut, ""),
      notes: rec.notes ?? "",
    });
    setFormOpen(true);
  };

  const openDeleteDialog = (rec: Attendance) => {
    setDeletingRecord(rec);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (values: AttendanceFormValues) => {
    try {
      setIsSubmitting(true);

      if (editingRecord) {
        // Bila jam masuk/keluar tidak berubah, kirim override lembur & telat
        // tersimpan agar tidak dihitung ulang (mis. lembur manual hari libur).
        const timesUnchanged =
          (values.checkIn || "") === formatTimeUTC(editingRecord.checkIn, "") &&
          (values.checkOut || "") === formatTimeUTC(editingRecord.checkOut, "");
        const payload = timesUnchanged
          ? {
              ...values,
              overtimeHours: editingRecord.overtimeHours,
              lateMinutes: editingRecord.lateMinutes,
            }
          : values;
        await axios.put(`/api/attendance/${editingRecord.id}`, payload);
        toast.success("Data kehadiran berhasil diperbarui");
      } else {
        await axios.post("/api/attendance", values);
        toast.success("Data kehadiran berhasil ditambahkan");
      }

      setFormOpen(false);
      form.reset();
      fetchRecords();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data;
        if (data.errors) {
          for (const [field, messages] of Object.entries(data.errors)) {
            form.setError(field as keyof AttendanceFormValues, {
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
    if (!deletingRecord) return;
    try {
      setIsDeleting(true);
      await axios.delete(`/api/attendance/${deletingRecord.id}`);
      toast.success("Data kehadiran berhasil dihapus");
      setDeleteDialogOpen(false);
      fetchRecords();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        toast.error(
          error.response.data.message || "Gagal menghapus data kehadiran"
        );
      } else {
        toast.error("Gagal menghapus data kehadiran");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Bulk Attendance Handlers ──────────────────────────

  const openBulkDialog = () => {
    setBulkDate(todayLocalISO());
    setBulkErrors([]);
    setBulkEntries(
      employees.map((e) => ({
        employeeId: e.id,
        employeeName: e.fullName,
        employeeCode: e.code,
        checkIn: "08:00",
        checkOut: "17:00",
        status: "PRESENT",
        notes: "",
      }))
    );
    setBulkOpen(true);
  };

  const updateBulkEntry = useCallback(
    (index: number, field: keyof BulkEntry, value: string) => {
      setBulkEntries((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        // If status is not PRESENT/LATE, clear check-in/check-out
        if (field === "status" && !["PRESENT", "LATE"].includes(value)) {
          updated[index].checkIn = "";
          updated[index].checkOut = "";
        }
        // If status changed to PRESENT, set default times
        if (field === "status" && value === "PRESENT" && !updated[index].checkIn) {
          updated[index].checkIn = "08:00";
          updated[index].checkOut = "17:00";
        }
        return updated;
      });
    },
    []
  );

  const setAllPresent = () => {
    setBulkEntries((prev) =>
      prev.map((e) => ({
        ...e,
        checkIn: "08:00",
        checkOut: "17:00",
        status: "PRESENT",
        notes: "",
      }))
    );
  };

  const handleBulkSubmit = async () => {
    if (!bulkDate || bulkEntries.length === 0) return;
    try {
      setIsBulkSubmitting(true);
      const payload = {
        date: bulkDate,
        entries: bulkEntries.map((e) => ({
          employeeId: e.employeeId,
          checkIn: e.checkIn || undefined,
          checkOut: e.checkOut || undefined,
          status: e.status,
          notes: e.notes || undefined,
        })),
      };
      const res = await axios.post("/api/attendance/bulk", payload);
      const result = res.data.data;
      const errors: string[] = result?.errors ?? [];

      if (errors.length > 0) {
        setBulkErrors(errors);
        toast.warning(
          `${result.created} disimpan, ${result.skipped} dilewati — periksa rincian di dialog.`
        );
        // Dialog tetap terbuka agar admin bisa membaca rincian error
      } else {
        toast.success(
          `Berhasil: ${result.created} disimpan, ${result.skipped} dilewati (sudah ada)`
        );
        setBulkOpen(false);
      }
      fetchRecords();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Gagal menyimpan absensi massal"));
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // ─── Table Columns ────────────────────────────────────

  const columns: Column<Attendance>[] = [
    {
      key: "employee",
      header: "Karyawan",
      render: (row) => (
        <div>
          <div className="font-medium">{row.employee.fullName}</div>
          <div className="text-xs text-muted-foreground">{row.employee.code}</div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Tanggal",
      sortable: true,
      className: "w-[160px]",
      render: (row) => (
        <span className="text-sm">{formatDateWithDay(row.date)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-[120px]",
      render: (row) => (
        <Badge variant={getAttendanceStatusVariant(row.status)} className="text-xs">
          {ATTENDANCE_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "checkIn",
      header: "Masuk",
      className: "w-[80px] hidden sm:table-cell",
      render: (row) => (
        <span className="text-sm font-mono">
          {formatTimeUTC(row.checkIn)}
        </span>
      ),
    },
    {
      key: "checkOut",
      header: "Keluar",
      className: "w-[80px] hidden sm:table-cell",
      render: (row) => (
        <span className="text-sm font-mono">
          {formatTimeUTC(row.checkOut)}
        </span>
      ),
    },
    {
      key: "lateMinutes",
      header: "Terlambat",
      sortable: true,
      className: "w-[100px] hidden md:table-cell",
      render: (row) =>
        row.lateMinutes > 0 ? (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-xs font-medium">{row.lateMinutes} menit</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "workingHours",
      header: "Jam Kerja",
      className: "w-[90px] hidden lg:table-cell",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs">{row.workingHours} jam</span>
        </div>
      ),
    },
    {
      key: "overtimeHours",
      header: "Lembur",
      className: "w-[90px] hidden lg:table-cell",
      render: (row) =>
        row.overtimeHours > 0 ? (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {row.overtimeHours} jam
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[70px]",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none max-sm:h-10 max-sm:w-10"
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
        <h2 className="text-2xl font-bold tracking-tight">Kehadiran</h2>
        <p className="text-muted-foreground">
          Kelola data kehadiran karyawan. Jam keterlambatan dan lembur
          dihitung otomatis.
        </p>
      </div>

      {/* Data Table Card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Data Kehadiran
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {total} data
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filter bar */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            {/* Status filter */}
            <div className="w-full space-y-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  if (val) {
                    setStatusFilter(val === "ALL" ? "" : val);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[140px] h-9">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="w-[calc(50%-0.375rem)] space-y-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Dari</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[150px] h-9"
              />
            </div>
            <div className="w-[calc(50%-0.375rem)] space-y-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Sampai</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[150px] h-9"
              />
            </div>

            {/* Clear filters */}
            {(statusFilter || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  setStatusFilter("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
              >
                Reset Filter
              </Button>
            )}
          </div>

          <DataTable<Attendance>
            columns={columns}
            data={records}
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
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openBulkDialog} className="gap-2">
                  <Users className="h-4 w-4" />
                  Absensi Massal
                </Button>
                <Button size="sm" onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Edit Kehadiran" : "Tambah Kehadiran"}
            </DialogTitle>
            <DialogDescription>
              {editingRecord
                ? "Perbarui data kehadiran karyawan."
                : "Catat kehadiran karyawan. Keterlambatan dan lembur dihitung otomatis berdasarkan jam masuk/keluar."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Employee */}
            <div className="space-y-2">
              <Label>
                Karyawan <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("employeeId")}
                onValueChange={(val) => {
                  if (val) form.setValue("employeeId", val, { shouldValidate: true })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan">
                    {(val: string) => {
                      const emp = employees.find((e) => e.id === val);
                      return emp ? `${emp.fullName} (${emp.code})` : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} ({e.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.employeeId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.employeeId.message}
                </p>
              )}
            </div>

            {/* Date + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="att-date">
                  Tanggal <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="att-date"
                  type="date"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.date.message}
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
                      form.setValue(
                        "status",
                        val as AttendanceFormValues["status"],
                        { shouldValidate: true }
                      )
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status">
                      {(val: string) => ATTENDANCE_STATUS_LABELS[val as keyof typeof ATTENDANCE_STATUS_LABELS] || val}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ATTENDANCE_STATUS_LABELS).map(
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

            {/* Check In + Check Out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Jam Masuk</Label>
                <Input
                  id="checkIn"
                  type="time"
                  {...form.register("checkIn")}
                />
                {form.formState.errors.checkIn && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.checkIn.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Jam Keluar</Label>
                <Input
                  id="checkOut"
                  type="time"
                  {...form.register("checkOut")}
                />
                {form.formState.errors.checkOut && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.checkOut.message}
                  </p>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <strong>Info:</strong> Jika jam masuk melebihi 08:00, status akan
              otomatis diubah ke &quot;Terlambat&quot;. Jika terlambat &gt;60 menit, akan
              dianggap &quot;Tidak Hadir&quot;. Lembur dihitung dari jam kerja setelah
              17:00.
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                placeholder="Catatan tambahan (opsional)"
                {...form.register("notes")}
              />
            </div>

            <DialogFooter className="pt-2">
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
                  : editingRecord
                  ? "Simpan Perubahan"
                  : "Tambah Kehadiran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Data Kehadiran"
        description={`Apakah Anda yakin ingin menghapus data kehadiran ${deletingRecord?.employee.fullName} pada ${deletingRecord ? formatDateWithDay(deletingRecord.date) : ""}?`}
        confirmLabel="Ya, Hapus"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      {/* Bulk Attendance Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="flex flex-col overflow-hidden sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Absensi Massal
            </DialogTitle>
            <DialogDescription>
              Input kehadiran seluruh karyawan sekaligus untuk satu tanggal.
              Keterlambatan dan lembur dihitung otomatis.
            </DialogDescription>
          </DialogHeader>

          {/* Date picker + quick actions */}
          <div className="flex flex-wrap items-end gap-3 py-2">
            <div className="w-full space-y-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Tanggal Absensi</Label>
              <Input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="w-full sm:w-[180px] h-9"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              onClick={setAllPresent}
            >
              <CheckCircle2 className="h-4 w-4" />
              Set Semua Hadir
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              {bulkEntries.length} karyawan
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <strong>Info:</strong> Terlambat &gt;08:00 = status otomatis &quot;Terlambat&quot;. Terlambat &gt;60 menit = &quot;Tidak Hadir&quot;.
            Untuk Cuti/Sakit/Liburan, pilih status lalu jam masuk &amp; keluar akan dikosongkan.
          </div>

          {/* Truncation warning */}
          {employeeTotal > employees.length && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Hanya {employees.length} dari {employeeTotal} karyawan yang berhasil
              dimuat — sebagian karyawan tidak akan tercatat. Muat ulang halaman.
            </div>
          )}

          {/* Bulk errors panel */}
          {bulkErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="mb-1 text-xs font-semibold text-destructive">
                Sebagian entri tidak tersimpan:
              </p>
              <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {bulkErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Scrollable employee list — SATU kontainer memiliki kedua sumbu
              scroll agar sticky header benar-benar menempel (Table primitive
              menyisipkan scroller-x sendiri yang mematahkan sticky) */}
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border max-h-[45dvh] sm:max-h-[400px]">
            {/* ≥sm: tabel */}
            <div className="hidden sm:block">
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[180px]">Karyawan</TableHead>
                    <TableHead className="w-[110px]">Jam Masuk</TableHead>
                    <TableHead className="w-[110px]">Jam Keluar</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkEntries.map((entry, idx) => (
                    <BulkEntryRow
                      key={entry.employeeId}
                      entry={entry}
                      index={idx}
                      onChange={updateBulkEntry}
                    />
                  ))}
                </TableBody>
              </table>
            </div>
            {/* <sm: kartu bertumpuk per karyawan */}
            <div className="sm:hidden">
              {bulkEntries.map((entry, idx) => (
                <BulkEntryCard
                  key={entry.employeeId}
                  entry={entry}
                  index={idx}
                  onChange={updateBulkEntry}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkOpen(false)}
              disabled={isBulkSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleBulkSubmit}
              disabled={isBulkSubmitting || !bulkDate}
              className="gap-2"
            >
              {isBulkSubmitting ? "Menyimpan..." : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Simpan Semua ({bulkEntries.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
