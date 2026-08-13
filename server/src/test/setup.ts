import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// Integration tests get their own SQLite file, migrated and seeded fresh, completely isolated
// from the dev.db a developer might have open in another terminal. This is what makes it safe
// to run `npm test` at any time without clobbering manually-inspected data.
const TEST_DB_PATH = path.join(__dirname, "../test.db");

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-not-for-production-use";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-not-for-production-use";
process.env.CORS_ORIGINS ??= "http://localhost:5173";

for (const suffix of ["", "-wal", "-shm"]) {
  if (fs.existsSync(TEST_DB_PATH + suffix)) fs.unlinkSync(TEST_DB_PATH + suffix);
}

execSync(`npx drizzle-kit push --force`, {
  cwd: path.join(__dirname, "../.."),
  env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
  stdio: "pipe",
});
