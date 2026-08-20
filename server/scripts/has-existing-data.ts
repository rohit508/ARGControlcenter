import "dotenv/config";
import { Pool } from "pg";

/**
 * Exit 0 (true) if the `users` table already has rows, exit 1 (false) otherwise. Used by
 * deploy-start.sh to decide whether to seed — mirrors the old SQLite version's "does dev.db
 * already exist and have content" check, since there's no file to stat against Postgres.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query("SELECT 1 FROM users LIMIT 1");
    process.exit(res.rowCount && res.rowCount > 0 ? 0 : 1);
  } catch {
    // Table doesn't exist yet (fresh DB before first db:push) — treat as "no existing data".
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
