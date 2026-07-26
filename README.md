# PayrollSys — Sistem Manajemen Penggajian

Aplikasi manajemen penggajian (payroll) berbasis **Next.js 16 (App Router)**, **PostgreSQL + Prisma**, **Tailwind CSS + shadcn/ui**. Fitur: master data karyawan/departemen/jabatan, presensi harian & massal, tunjangan/potongan per-karyawan, aturan penalti keterlambatan/alpa, generate gaji massal, slip gaji cetak, laporan, dan portal karyawan.

## Menjalankan Secara Lokal

```bash
npm install
cp .env.example .env    # isi DATABASE_URL, SESSION_SECRET, ADMIN_ID, ADMIN_PASSWORD
npx prisma db push      # sinkronkan schema ke database
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variabel | Wajib | Keterangan |
| :--- | :--- | :--- |
| `DATABASE_URL` | Ya | Koneksi PostgreSQL (mis. Supabase pooler). Selalu terenkripsi TLS. |
| `DATABASE_SSL_CA` | Tidak | Path file CA cert (atau isi PEM) untuk mengaktifkan verifikasi sertifikat server — dianjurkan untuk produksi sungguhan. Tanpa ini sertifikat tidak diverifikasi. |
| `SESSION_SECRET` | Ya (production) | Secret HMAC-SHA256 penandatangan sesi, minimal 32 karakter (`openssl rand -base64 48`). |
| `ADMIN_ID` | Ya (production) | ID login admin (case-insensitive). |
| `ADMIN_PASSWORD` | Ya (production) | Password admin (case-sensitive). Tanpa env ini login admin dinonaktifkan. |
| `ALLOW_SEED` | Tidak | Set `"true"` untuk mengizinkan `POST /api/seed` di production. |

## Catatan Keamanan & Perubahan Penting

- Token sesi ditandatangani HMAC-SHA256; sesi format lama otomatis tidak valid (semua user login ulang).
- Password karyawan disimpan sebagai hash bcrypt dan **tidak pernah** dikirim ke browser. Password legacy plaintext otomatis ter-upgrade saat login pertama yang berhasil. Password backdoor `123456` universal telah dihapus (nilai `123456` hanya menjadi password awal ter-hash untuk karyawan baru bila admin tidak mengisi password).
- Semua endpoint API admin memverifikasi sesi admin di handler (`requireAdmin`), bukan hanya di proxy.
- `POST /api/seed` (dulu GET publik) kini admin-only dan nonaktif di production — **menghapus seluruh isi database** saat dijalankan.
- Perhitungan gaji membaca tunjangan/potongan **dari assignment per-karyawan** (junction table). Generate ulang DRAFT setelah upgrade dapat mengubah total secara sah bila ada master yang tidak di-assign ke karyawan tertentu.
- Jam presensi disimpan UTC-anchored; data presensi yang dibuat sebelum upgrade dapat tampak bergeser hingga di-resave atau di-reseed.

## Dokumentasi

- [docs/PAYROLL_SYSTEM_GUIDE.md](docs/PAYROLL_SYSTEM_GUIDE.md) — alur bisnis, rumus perhitungan, proteksi data.
- [docs/DATABASE_GUIDE.md](docs/DATABASE_GUIDE.md) — struktur tabel, relasi, dan konvensi database.
- [docs/STRUCTURE_GUIDE.md](docs/STRUCTURE_GUIDE.md) — peta struktur folder & file kode (app, components, lib, route `[id]`, dst.) dalam bahasa sederhana.

## Seeding Data

- `npx prisma db seed` (atau jalankan `prisma/seed.ts`) — data dasar idempoten: 3 departemen, 3 jabatan, master tunjangan/potongan, 3 karyawan, dan 4 aturan penalti default.
- `POST /api/seed` (admin, non-production) — dataset studi kasus lengkap (10 karyawan, presensi & payroll Juli 2018). **Menghapus semua data lama terlebih dahulu.**
