import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DIRECT_DATABASE_URL / DATABASE_URL");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false });

  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  const checks = await sql<{ conname: string; consrc: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) AS consrc
    FROM pg_constraint
    WHERE conrelid = 'public.ratings'::regclass AND contype = 'c'
    ORDER BY conname
  `;

  console.log("\nTables in public schema:");
  for (const t of tables) console.log(`  - ${t.table_name}`);

  console.log("\nCHECK constraints on ratings:");
  for (const c of checks) console.log(`  - ${c.conname}: ${c.consrc}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
