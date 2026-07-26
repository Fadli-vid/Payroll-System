/**
 * Unduh data sebagai file CSV di browser (via Blob — aman untuk karakter
 * khusus seperti #, koma, dan kutip).
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeCell = (cell: string | number): string => {
    const s = String(cell);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  // BOM agar Excel membaca UTF-8 dengan benar
  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
