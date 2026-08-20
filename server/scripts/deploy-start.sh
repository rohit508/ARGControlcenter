#!/bin/sh
# Render start command for Postgres (Neon): applies the schema with `drizzle-kit push`, which is
# non-destructive — it diffs the live schema against the code and only adds what's missing
# (tables/columns), never drops or truncates. Safe to re-run on every deploy. Seeds demo data
# only if `users` has no rows yet (fresh database) — once real data exists, seeding is skipped so
# nothing gets overwritten. See has-existing-data.ts for the existence check (no local file to
# stat against a remote Postgres, unlike the old SQLite version of this script).
set -e

npm run db:push

if npx ts-node scripts/has-existing-data.ts; then
  echo "Existing data found in users table — skipping seed."
else
  echo "No existing data found — seeding demo data..."
  npm run seed
fi

exec npm start
