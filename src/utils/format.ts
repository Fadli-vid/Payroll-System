/**
 * Format a number as Indonesian Rupiah currency.
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format a Date or ISO string to Indonesian locale date string.
 * Rendered in UTC — tanggal (hireDate, attendance.date) disimpan sebagai
 * UTC midnight, sehingga tidak bergeser hari di timezone mana pun.
 * Example: "19 Juli 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format a Date or ISO string to short date string (UTC-rendered).
 * Example: "19/07/2026"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format a Date or ISO string to time string in the LOCAL timezone.
 * Jangan gunakan untuk checkIn/checkOut kehadiran — pakai formatTimeUTC.
 * Example: "08:00"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format an attendance checkIn/checkOut ISO string to "HH:mm".
 * Kontrak API: waktu kehadiran disimpan wall-clock UTC-anchored — WAJIB
 * dirender dengan getter UTC agar tidak bergeser mengikuti timezone browser.
 */
export function formatTimeUTC(
  iso: string | Date | null | undefined,
  empty = "—"
): string {
  if (!iso) return empty;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return empty;
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Tanggal hari ini (timezone lokal pengguna) dalam format "YYYY-MM-DD".
 * Pengganti `new Date().toISOString().split("T")[0]` yang salah tanggal
 * antara jam 00:00–07:00 WIB.
 */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format a number with thousand separators (Indonesian style).
 * Example: 1500000 → "1.500.000"
 */
export function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("id-ID").format(n);
}
