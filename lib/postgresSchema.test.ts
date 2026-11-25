import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toPostgresSchema } from "./postgresSchema";

describe("Postgres schema for the live site", () => {
  it("is in sync with prisma/schema.prisma (run `npm run db:pg:migration -- <name>` if this fails)", () => {
    const expected = toPostgresSchema(readFileSync("prisma/schema.prisma", "utf8"));
    expect(readFileSync("prisma/postgres/schema.prisma", "utf8")).toBe(expected);
  });

  it("switches only the datasource", () => {
    const pg = toPostgresSchema(readFileSync("prisma/schema.prisma", "utf8"));
    expect(pg).toContain('provider  = "postgresql"');
    expect(pg).toContain('directUrl = env("DIRECT_URL")');
    expect(pg).not.toContain('provider = "sqlite"');
    expect(pg).toContain("model GroupOrder {");
  });
});
