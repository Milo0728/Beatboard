/**
 * Apply a raw SQL file against the database.
 * Usage: npx tsx scripts/apply-sql.ts drizzle/0001_auth_user_sync.sql
 */
import { readFile } from "node:fs/promises";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/apply-sql.ts <path-to-sql>");
    process.exit(1);
  }

  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DIRECT_DATABASE_URL / DATABASE_URL");
    process.exit(1);
  }

  const sqlText = await readFile(file, "utf8");
  const sql = postgres(url, { prepare: false });

  try {
    await sql.unsafe(sqlText);
    console.log(`✓ Applied ${file}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
