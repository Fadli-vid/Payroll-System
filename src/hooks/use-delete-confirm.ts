"use client";

import { useCallback, useState } from "react";

/**
 * State machine untuk dialog konfirmasi hapus:
 * - request(item) membuka dialog untuk item tsb
 * - confirm() menjalankan deleteFn; dialog menutup hanya bila sukses,
 *   tetap terbuka bila gagal (deleteFn harus melempar error saat gagal)
 * - isDeleting untuk menonaktifkan tombol selama proses
 */
export function useDeleteConfirm<T>(deleteFn: (item: T) => Promise<void>) {
  const [item, setItem] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const request = useCallback((target: T) => {
    setItem(target);
    setOpen(true);
  }, []);

  const confirm = useCallback(async () => {
    if (!item) return;
    setIsDeleting(true);
    try {
      await deleteFn(item);
      setOpen(false);
      setItem(null);
    } catch {
      // Biarkan dialog tetap terbuka; deleteFn bertanggung jawab menampilkan toast error
    } finally {
      setIsDeleting(false);
    }
  }, [item, deleteFn]);

  return { open, setOpen, item, request, confirm, isDeleting };
}
