import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  let pgUrl = process.env.DATABASE_URL || "";

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

  const poolerHost = "aws-0-ap-southeast-1.pooler.supabase.com";
  let resolvedUrl = pgUrl;
  if (resolvedUrl.includes(poolerHost)) {
    resolvedUrl = resolvedUrl.replace(poolerHost, "52.74.252.201");
  }

  const pool = new Pool({
    connectionString: resolvedUrl,
    ssl: {
      rejectUnauthorized: false,
      servername: poolerHost,
    },
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
