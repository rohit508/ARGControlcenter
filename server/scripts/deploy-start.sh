#!/bin/sh
# Railway start command: applies the schema to the volume-backed database (safe to re-run —
# drizzle-orm's migrator tracks which migrations already ran) and seeds demo data only the
# first time this ever runs (an empty/missing DB file). Once real data exists on the volume,
# subsequent deploys skip seeding so nothing gets overwritten.
#
# Uses `db:migrate` (drizzle-orm's own migrator, running through the app's better-sqlite3
# binary), not `db:push`/drizzle-kit's CLI — the drizzle-kit CLI ships a separate native SQLite
# binding that segfaults on Railway's container even when better-sqlite3 itself works fine.
set -e

DB_FILE=$(echo "$DATABASE_URL" | sed 's/^file://')
DB_ALREADY_EXISTED=false
if [ -f "$DB_FILE" ] && [ -s "$DB_FILE" ]; then
  DB_ALREADY_EXISTED=true
fi

npm run db:migrate

if [ "$DB_ALREADY_EXISTED" = true ]; then
  echo "Existing database found at $DB_FILE — skipping seed."
else
  echo "No existing database found at $DB_FILE — seeding demo data..."
  npm run seed
fi

exec npm start
