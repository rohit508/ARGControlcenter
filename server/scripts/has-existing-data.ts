import "dotenv/config";
import { Pool } from "pg";

/**
 * Exit 0 (true) if the `users` table already has rows, exit 1 (false) only if the table is
 * confirmed to not exist yet (fresh DB before first db:push). Any other failure (connection
 * timeout, Neon cold-start, network blip) exits 2 and must NOT be treated as "no existing data" —
 * that misread previously caused deploy-start.sh to run seed.ts's TRUNCATE ... CASCADE against a
 * database that actually had real production data, wiping it.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query("SELECT 1 FROM users LIMIT 1");
    process.exit(res.rowCount && res.rowCount > 0 ? 0 : 1);
  } catch (err) {
    if ((err as { code?: string }).code === "42P01") {
      // relation "users" does not exist — genuinely fresh database.
      process.exit(1);
    }
    console.error("[has-existing-data] Could not verify existing data; refusing to guess:", err);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
