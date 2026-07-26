"use client";

import { useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onSearchChange?: (search: string) => void;
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

// ─── Skeleton Row ────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Component ───────────────────────────────────────────

export function DataTable<T extends object>({
  columns,
  data,
  total,
  page,
  pageSize,
  search = "",
  sortBy,
  sortOrder = "desc",
  isLoading = false,
  onPageChange,
  onSearchChange,
  onSortChange,
  searchPlaceholder = "Cari...",
  actions,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounce 300ms saat mengetik; submit (Enter) / clear langsung
  const emitSearch = (value: string, immediate = false) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (immediate) {
      onSearchChange?.(value);
    } else {
      debounceRef.current = setTimeout(() => onSearchChange?.(value), 300);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    emitSearch(localSearch, true);
  };

  const handleSort = (key: string) => {
    if (!onSortChange) return;
    if (sortBy === key) {
      onSortChange(key, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(key, "asc");
    }
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onSearchChange && (
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => emitSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 h-9"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => emitSearch("", true)}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground max-sm:p-2 max-sm:right-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.className}
                  aria-sort={
                    col.sortable && sortBy === col.key
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="flex min-h-8 items-center gap-1.5 hover:text-foreground transition-colors max-sm:min-h-10"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.header}
                      {getSortIcon(col.key)}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-40 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-40" />
                    <span className="text-sm">
                      {search || localSearch
                        ? "Tidak ada hasil untuk pencarian ini — coba ubah kata kunci atau hapus filter."
                        : "Belum ada data."}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => {
                const record = row as Record<string, unknown>;
                return (
                <TableRow key={(record.id as string) || idx}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : (record[col.key] as React.ReactNode) ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: ringkasan selalu tampil; tombol halaman hanya bila perlu */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "0 data"
            : `Menampilkan ${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                total
              )} dari ${total} data`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="Halaman pertama"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label="Halaman terakhir"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
