import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

console.log("Running migration 0002...");
try {
  await sql`DROP INDEX IF EXISTS "businesses_google_location_unique"`;
  console.log("✓ Dropped old unique index.");
  await sql`CREATE UNIQUE INDEX "businesses_google_location_unique" ON "businesses" USING btree ("workspace_id","google_location_id")`;
  console.log("✓ Created new per-workspace unique index.");
  console.log("✓ Migration 0002 applied successfully.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
