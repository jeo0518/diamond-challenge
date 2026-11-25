// npm run db:pg:schema — regenerates prisma/postgres/schema.prisma from prisma/schema.prisma.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { toPostgresSchema } from "../lib/postgresSchema";

export const SQLITE_SCHEMA = "prisma/schema.prisma";
export const POSTGRES_SCHEMA = "prisma/postgres/schema.prisma";

export function writePostgresSchema() {
  mkdirSync("prisma/postgres", { recursive: true });
  const next = toPostgresSchema(readFileSync(SQLITE_SCHEMA, "utf8"));
  writeFileSync(POSTGRES_SCHEMA, next);
  return next;
}

if (process.argv[1]?.endsWith("postgres-schema.ts")) {
  writePostgresSchema();
  console.log(`Wrote ${POSTGRES_SCHEMA}`);
}
