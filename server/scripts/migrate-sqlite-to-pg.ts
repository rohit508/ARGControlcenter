import "dotenv/config";
import path from "path";
import Database from "better-sqlite3";
import { Pool } from "pg";

/**
 * One-off data migration: copies every row from the local SQLite dev.db into the Neon
 * Postgres database, in FK-safe order (parents before children — order below was computed
 * by topologically sorting the actual FK graph read back from Postgres' information_schema,
 * not guessed by hand).
 *
 * Read-only against SQLite; only inserts into Postgres. Safe to re-run against an empty
 * Postgres database — NOT idempotent against a already-populated one (will hit PK conflicts).
 */

const SQLITE_PATH = process.argv[2] || path.join(__dirname, "../dev.db");

const TABLE_ORDER = [
  "departments", "employees", "lookup_lists", "lookup_values", "roles", "permissions",
  "workflow_definitions", "users", "workflow_instances", "projects", "project_shares",
  "issues", "meetings", "milestones", "attendance_records", "customers", "journal_entries",
  "chart_of_accounts", "risks", "tasks", "opportunities", "vendors", "assets", "leads",
  "leave_requests", "kb_articles", "maintenance_logs", "tickets", "stock_items",
  "refresh_tokens", "role_permissions", "workflow_actions", "change_requests", "contacts",
  "warehouses", "work_centers", "employee_tasks", "employee_task_assignments", "audit_log",
  "notifications", "comments", "user_roles", "action_items", "budget_entries",
  "kpi_snapshots", "lessons_learned", "meeting_attendees", "journal_lines",
  "purchase_orders", "stock_levels", "boms", "stock_transactions", "attachments",
  "po_lines", "bom_lines", "production_orders",
];

// Columns that are `boolean` / `timestamp` on the Postgres side (SQLite stored booleans as
// integer 0/1 and timestamps as integer unix-epoch seconds — confirmed by direct inspection of
// dev.db, e.g. users.created_at = 1787146908 = 2026-08-19). Read directly from Neon's
// information_schema so these lists can't drift from the real schema. Populated at startup in
// main(); do not hand-maintain.
const BOOLEAN_COLUMNS: Record<string, string[]> = {};
const TIMESTAMP_COLUMNS: Record<string, string[]> = {};

async function loadColumnTypes(pool: Pool): Promise<void> {
  const res = await pool.query(
    `SELECT table_name, column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND (data_type = 'boolean' OR data_type LIKE 'timestamp%')`
  );
  for (const row of res.rows as { table_name: string; column_name: string; data_type: string }[]) {
    const bucket = row.data_type === "boolean" ? BOOLEAN_COLUMNS : TIMESTAMP_COLUMNS;
    if (!bucket[row.table_name]) bucket[row.table_name] = [];
    bucket[row.table_name].push(row.column_name);
  }
}

function coerceRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const boolCols = BOOLEAN_COLUMNS[table] || [];
  const tsCols = TIMESTAMP_COLUMNS[table] || [];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (boolCols.includes(key)) {
      out[key] = value === 1 || value === true;
    } else if (tsCols.includes(key)) {
      out[key] = value == null ? null : new Date((value as number) * 1000);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — expected the Neon connection string (e.g. via .env.local)");
  }
  if (!process.env.DATABASE_URL.startsWith("postgres")) {
    throw new Error(`DATABASE_URL does not look like a Postgres URL: ${process.env.DATABASE_URL.slice(0, 20)}...`);
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  console.log(`Source: ${SQLITE_PATH}`);
  console.log(`Target: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log("");

  await loadColumnTypes(pool);

  const summary: { table: string; sourceCount: number; insertedCount: number }[] = [];

  try {
    for (const table of TABLE_ORDER) {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];

      if (rows.length === 0) {
        summary.push({ table, sourceCount: 0, insertedCount: 0 });
        console.log(`${table}: 0 rows (skipped)`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const columnList = columns.map((c) => `"${c}"`).join(", ");

      let inserted = 0;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const rawRow of rows) {
          const row = coerceRow(table, rawRow);
          const values = columns.map((c) => row[c]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
          await client.query(
            `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Failed inserting into "${table}" after ${inserted}/${rows.length} rows: ${(err as Error).message}`);
      } finally {
        client.release();
      }

      summary.push({ table, sourceCount: rows.length, insertedCount: inserted });
      console.log(`${table}: ${inserted}/${rows.length} rows inserted`);
    }

    // Reset every serial sequence to max(id)+1 so future inserts don't collide with migrated ids.
    // Junction tables (role_permissions, user_roles) have a composite PK and no `id` column /
    // sequence at all, so pg_get_serial_sequence(table, 'id') legitimately returns null for them
    // — that's expected, not an error, and is skipped.
    console.log("\nResetting sequences...");
    for (const table of TABLE_ORDER) {
      const hasIdCol = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='id'`,
        [table]
      );
      if (hasIdCol.rowCount === 0) continue;

      const seqResult = await pool.query(
        `SELECT pg_get_serial_sequence($1, 'id') AS seq`,
        [table]
      );
      const seqName = seqResult.rows[0]?.seq;
      if (!seqName) continue;
      await pool.query(
        `SELECT setval($1, COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT MAX(id) IS NOT NULL FROM "${table}"))`,
        [seqName]
      );
    }
    console.log("Sequences reset.");

    console.log("\n=== Migration summary ===");
    let totalSource = 0;
    let totalInserted = 0;
    let mismatches = 0;
    for (const s of summary) {
      totalSource += s.sourceCount;
      totalInserted += s.insertedCount;
      const flag = s.sourceCount !== s.insertedCount ? "  <-- MISMATCH" : "";
      if (flag) mismatches++;
      console.log(`${s.table.padEnd(28)} source=${s.sourceCount}  inserted=${s.insertedCount}${flag}`);
    }
    console.log(`\nTotal: source=${totalSource} inserted=${totalInserted}`);
    if (mismatches > 0) {
      console.error(`\n${mismatches} table(s) had row-count mismatches — see above.`);
      process.exitCode = 1;
    } else {
      console.log("\nAll tables matched. Migration complete.");
    }
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\nMigration FAILED:", err.message);
  process.exit(1);
});
