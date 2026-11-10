// A single shared Prisma client for the whole app.
// In development, Next.js reloads files often; storing the client on
// `globalThis` keeps us from opening a new database connection on every reload.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
