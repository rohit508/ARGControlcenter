#!/bin/sh
# Render start command for Postgres (Neon): applies the schema with `drizzle-kit push`, which is
# non-destructive — it diffs the live schema against the code and only adds what's missing
# (tables/columns), never drops or truncates. Safe to re-run on every deploy. Seeds demo data
# only if `users` has no rows yet (fresh database) — once real data exists, seeding is skipped so
# nothing gets overwritten. See has-existing-data.ts for the existence check (no local file to
# stat against a remote Postgres, unlike the old SQLite version of this script).
#
# has-existing-data.ts exits 0 (has data), 1 (confirmed fresh — table doesn't exist), or
# 2 (couldn't tell, e.g. a connection timeout / Neon cold-start). Only exit 1 may trigger a seed.
# Exit 2 must abort the deploy rather than guess — guessing "empty" on a transient error is what
# previously caused a live production database to be silently TRUNCATEd on a routine restart.
set -e

npm run db:push

set +e
npx ts-node scripts/has-existing-data.ts
data_check_status=$?
set -e

if [ "$data_check_status" -eq 0 ]; then
  echo "Existing data found in users table — skipping seed."
elif [ "$data_check_status" -eq 1 ]; then
  echo "No existing data found — seeding demo data..."
  npm run seed
else
  echo "Could not verify whether the database already has data (see error above)." >&2
  echo "Refusing to start until this is resolved — seeding here could destroy production data." >&2
  exit 1
fi

exec npm start
