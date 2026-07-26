import axios from "axios";
import type { ApiResponse, PaginatedResponse } from "@/src/types";

/**
 * GET yang membongkar amplop { success, data } menjadi data bertipe T.
 * Melempar Error dengan pesan API bila success = false.
 */
export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<T> {
  const res = await axios.get<ApiResponse<T>>(url, { params });
  if (!res.data.success || res.data.data === undefined) {
    throw new Error(res.data.message || "Gagal memuat data");
  }
  return res.data.data;
}

/**
 * GET untuk endpoint list berpaginasi ({ data, meta }).
 */
export function apiList<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<PaginatedResponse<T>> {
  return apiGet<PaginatedResponse<T>>(url, params);
}

/**
 * Ambil pesan error yang ramah pengguna dari error axios/apapun.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as ApiResponse | undefined)?.message;
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Ambil SEMUA halaman dari endpoint list berpaginasi (API membatasi
 * pageSize maks 100). Berguna untuk dropdown/bulk input yang butuh
 * daftar lengkap.
 */
export async function fetchAllPages<T>(
  url: string,
  params: Record<string, unknown> = {},
  pageSize = 100
): Promise<{ items: T[]; total: number }> {
  const first = await apiList<T>(url, { ...params, page: 1, pageSize });
  const items = [...first.data];
  const { total, totalPages } = first.meta;

  for (let page = 2; page <= totalPages; page++) {
    const next = await apiList<T>(url, { ...params, page, pageSize });
    if (next.data.length === 0) break;
    items.push(...next.data);
  }

  return { items, total };
}
