import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// pg emits 'error' on the pool when an idle client's connection is dropped server-side (e.g.
// Neon suspending its compute after inactivity). Without a listener, Node treats that as an
// uncaught exception and kills the process. pg automatically removes the dead client from the
// pool and opens a fresh one on the next query, so logging is all that's needed here.
pool.on("error", (err) => {
  console.error("[db] pool error (recovering):", err.message);
});

export const db = drizzle(pool, { schema });
export { pool };
