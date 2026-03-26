import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Avoid `import "server-only"` here: without the `react-server` export condition it loads
// server-only/index.js, which throws immediately and breaks Route Handlers that import prisma.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getConnectionString(),
      max: Number(process.env.PG_POOL_MAX ?? 10),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    }),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const client = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = client;

export const prisma = client;
