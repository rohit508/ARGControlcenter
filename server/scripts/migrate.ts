// Applies drizzle/*.sql via drizzle-orm's own migrator, running straight through the app's
// already-working better-sqlite3 binary. Deliberately NOT `drizzle-kit push`/`migrate` — the
// drizzle-kit CLI ships its own separate native SQLite binding, and on Railway's container that
// binding segfaults outright (confirmed directly: db:push crashed even after better-sqlite3
// itself was fixed and the server ran fine). This script only depends on the binary already
// proven to work by the app's own boot path.
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbPath = dbUrl.replace("file:", "");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: path.join(__dirname, "../drizzle") });

console.log(`Migrations applied to ${dbPath}`);
sqlite.close();
