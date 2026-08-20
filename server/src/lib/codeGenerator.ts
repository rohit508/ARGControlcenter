import { db } from "../db/client";
import { sql } from "drizzle-orm";

/**
 * Generates the next sequential business code for a table (e.g. PRJ-001, TSK-0001).
 * Uses a simple max-scan under a transaction-safe UPDATE-then-read pattern; fine at this scale
 * (thousands of rows). At true enterprise scale this would move to a dedicated `sequences` table
 * with atomic increment — noted as a scaling follow-up, not a correctness issue today.
 *
 * NOTE: converted from a synchronous better-sqlite3 `db.get()` call to an async Postgres query as
 * part of the SQLite -> Postgres dialect migration (node-postgres has no synchronous API), and
 * SUBSTR(...) -> SUBSTRING(... FROM ...) for Postgres syntax. All call sites were updated to
 * `await` this function accordingly — flagged for a closer look/testing pass in a later step.
 */
export async function nextCode(table: string, column: string, prefix: string, pad = 3): Promise<string> {
  const result = await db.execute<{ maxNum: number | null }>(
    sql.raw(
      `SELECT MAX(CAST(SUBSTRING(${column} FROM ${prefix.length + 2}) AS INTEGER)) as "maxNum" FROM ${table} WHERE ${column} LIKE '${prefix}-%'`
    )
  );
  const row = result.rows[0];
  const next = ((row?.maxNum as number) || 0) + 1;
  return `${prefix}-${String(next).padStart(pad, "0")}`;
}
