// Builds the PRODUCTION (Postgres) schema from prisma/schema.prisma (SQLite).
//
// Why two schemas? Locally we use SQLite (zero setup). Online we use Postgres.
// Prisma picks the database type from one line in the schema, so we keep ONE
// schema to edit (prisma/schema.prisma) and generate prisma/postgres/schema.prisma from it.

export const POSTGRES_HEADER = `// ============================================================
// GENERATED FILE — DO NOT EDIT.
// Made from prisma/schema.prisma by \`npm run db:pg:schema\`.
// Edit prisma/schema.prisma instead, then run \`npm run db:pg:migration -- <name>\`.
// ============================================================
`;

const POSTGRES_DATASOURCE = `datasource db {
  provider  = "postgresql"
  // Pooled connection: used by the running app.
  url       = env("DATABASE_URL")
  // Direct (non-pooled) connection: used by \`prisma migrate\`. Can be the same URL if your host has no pooler.
  directUrl = env("DIRECT_URL")
}`;

export function toPostgresSchema(sqliteSchema: string): string {
  const datasource = /datasource db \{[\s\S]*?\n\}/;
  if (!datasource.test(sqliteSchema)) throw new Error("Couldn't find the `datasource db { ... }` block in prisma/schema.prisma.");
  const body = sqliteSchema.replace(datasource, POSTGRES_DATASOURCE);
  if (!body.includes('provider  = "postgresql"')) throw new Error("Failed to switch the provider to postgresql.");
  return POSTGRES_HEADER + "\n" + body;
}
