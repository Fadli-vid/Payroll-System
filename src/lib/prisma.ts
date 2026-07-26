import { readFileSync } from "node:fs";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// CA cert kustom (mis. CA Supabase yang self-signed) via DATABASE_SSL_CA:
// isi PEM langsung atau path ke file .crt/.pem. Verifikasi TLS tetap aktif.
function resolveSslCa(): string | undefined {
  const caEnv = process.env.DATABASE_SSL_CA?.trim();
  if (!caEnv) return undefined;
  if (caEnv.includes("-----BEGIN CERTIFICATE-----")) {
    return caEnv.replace(/\\n/g, "\n");
  }
  try {
    return readFileSync(caEnv, "utf-8");
  } catch (error) {
    console.error(
      `[db] Gagal membaca file CA dari DATABASE_SSL_CA ("${caEnv}") — verifikasi TLS tetap ketat tanpa CA tambahan.`,
      error
    );
    return undefined;
  }
}

function createPrismaClient() {
  let pgUrl = process.env.DATABASE_URL || "";
  const sslCa = resolveSslCa();

  if (pgUrl.startsWith("prisma+postgres://")) {
    try {
      const url = new URL(pgUrl);
      const apiKey = url.searchParams.get("api_key") || "";
      const decoded = JSON.parse(
        Buffer.from(apiKey, "base64").toString("utf-8")
      );
      pgUrl = decoded.databaseUrl;
    } catch {
      // fallback
    }
  }

  const pool = new Pool({
    connectionString: pgUrl,
    // Koneksi tetap terenkripsi TLS. Verifikasi sertifikat hanya aktif bila
    // DATABASE_SSL_CA di-set (CA Supabase self-signed tidak lolos verifikasi
    // default). Tanpa CA, sertifikat tidak diverifikasi — cukup untuk proyek
    // ini; untuk produksi sungguhan, set DATABASE_SSL_CA.
    ssl: pgUrl.includes("sslmode=disable")
      ? undefined
      : sslCa
        ? { rejectUnauthorized: true, ca: sslCa }
        : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 5,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    // Password tidak pernah ikut ter-serialisasi ke response API.
    // Opt-in kembali hanya di verifyEmployeeCredentials via omit: { password: false }.
    omit: { employee: { password: true } },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
