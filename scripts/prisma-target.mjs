// Picks the right Prisma schema for where the app is running:
//   - DATABASE_URL starts with "postgres"  → prisma/postgres/schema.prisma (the live site)
//   - anything else (e.g. "file:./dev.db") → prisma/schema.prisma (SQLite on your computer)
//
//   node scripts/prisma-target.mjs generate   (runs after `npm install`)
//   node scripts/prisma-target.mjs build      (`npm run build`)
//
// This way the live site works with the normal `npm run build`, even if the
// hosting site's Build Command setting is left at its default.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/** DATABASE_URL from the environment (hosting sites), or from .env (your computer). */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(".env")) return "";
  const line = readFileSync(".env", "utf8").split("\n").find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
}

const url = databaseUrl();
const isPostgres = /^postgres(ql)?:\/\//.test(url);
const schema = isPostgres ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma";
const run = (cmd) => {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

const command = process.argv[2];
console.log(`Database: ${isPostgres ? "Postgres (live site)" : "SQLite (local)"} → using ${schema}`);

if (command === "generate") {
  run(`npx prisma generate --schema ${schema}`);
} else if (command === "build") {
  run(`npx prisma generate --schema ${schema}`);
  // On the live site, create/update the database tables before building.
  if (isPostgres) run(`npx prisma migrate deploy --schema ${schema}`);
  run("npx next build");
} else {
  console.error("Usage: node scripts/prisma-target.mjs <generate|build>");
  process.exit(1);
}
