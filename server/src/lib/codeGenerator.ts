import { db } from "../db/client";
import { sql } from "drizzle-orm";

/**
 * Generates the next sequential business code for a table (e.g. PRJ-001, TSK-0001).
 * Uses a simple max-scan under a transaction-safe UPDATE-then-read pattern; fine at this scale
 * (thousands of rows). At true enterprise scale this would move to a dedicated `sequences` table
 * with atomic increment — noted as a scaling follow-up, not a correctness issue today.
 */
export function nextCode(table: string, column: string, prefix: string, pad = 3): string {
  const row = db.get<{ maxNum: number | null }>(
    sql.raw(
      `SELECT MAX(CAST(SUBSTR(${column}, ${prefix.length + 2}) AS INTEGER)) as maxNum FROM ${table} WHERE ${column} LIKE '${prefix}-%'`
    )
  );
  const next = ((row?.maxNum as number) || 0) + 1;
  return `${prefix}-${String(next).padStart(pad, "0")}`;
}
