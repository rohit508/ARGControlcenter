# SQLite → PostgreSQL (Neon) Migration Plan

**Status:** Steps 1–6 done, Step 7 done locally (render.yaml deploy update still pending —
needs user confirmation before touching production config)
**Backup taken:** `server/backups/dev.db.backup_20260820_144106` (634,880 bytes, 70 users confirmed present)

## Goal

Move the database layer from `better-sqlite3` (local file DB) to PostgreSQL hosted on
Neon (free tier, no expiry), while keeping Drizzle ORM, and **without losing existing
seeded/production employee data** currently in `server/dev.db`.

Backend hosting stays on Render (`render.yaml` already configured). Only the database
target changes — Render will connect to Neon via `DATABASE_URL`.

## Why this order

Each step is checked before the next starts. If anything looks wrong at a checkpoint,
stop and fix it there rather than continuing — the whole point of the backup and the
verification step is to make this reversible until the very last step (cutover).

---

## Step 1 — Backup (done)

- [x] Copy `server/dev.db` to `server/backups/dev.db.backup_<timestamp>`
- [x] Confirm `*.db` is already in `.gitignore` so backups never get committed
- Rollback: if anything goes wrong at any later step, restore this file back to
  `server/dev.db` and the app is exactly as it was before migration started.

## Step 2 — Provision Neon PostgreSQL (done)

- [x] Create a free Neon project (neon.tech) — project `erp-production`, region AWS US East 2 (Ohio)
- [x] Grab the connection string (`postgres://...`)
- [x] Store it locally in `server/.env.local` as `DATABASE_URL` (confirmed git-ignored,
      never committed)
- Checkpoint: can connect to the empty Neon DB with `psql` or a quick Node script — next up.

## Step 3 — Update Drizzle config + schema for PostgreSQL (done)

- [x] Updated `server/drizzle.config.ts` dialect from `sqlite` to `postgresql`
- [x] Updated `server/src/db/client.ts` to use `drizzle-orm/node-postgres` (`pg.Pool`),
      exports `pool` instead of `sqlite`
- [x] Updated all 5 schema files — `sqliteTable` → `pgTable`, `integer(...autoIncrement)` →
      `serial`, `integer(mode:"timestamp")` → `timestamp(mode:"date")`, `integer(mode:"boolean")`
      → `boolean`, SQLite time defaults → `.defaultNow()`
- [x] Added `pg` + `@types/pg` to `server/package.json`
- **Scope overrun (necessary):** changing `client.ts`'s export from sync `sqlite` to async `pool`
      broke compilation everywhere that used sync-only better-sqlite3 APIs. Fixed in the same pass:
      `app.ts`, `server.ts` (readiness check / graceful shutdown), `seed.ts` (`DELETE` + manual
      `sqlite_sequence` reset → single `TRUNCATE ... RESTART IDENTITY CASCADE`), `codeGenerator.ts`
      (`nextCode()` made async, `SUBSTR` → `SUBSTRING(...FROM...)`, 13 call sites updated to
      `await`), `employees.service.ts` / `employee-tasks.service.ts` (sync `db.transaction` →
      async), `kpi-engine.routes.ts` (`db.all()` → `db.execute()` + `.rows`, SQLite `julianday()`
      date math → Postgres `date - date` integer subtraction).
- [x] Also fixed `server/scripts/add-test-ticket.ts` (untracked, pre-existing dev script outside
      `src/` — missed by the automated pass since it wasn't part of the app or test tree): added a
      missing `await` on the now-async `nextCode()` call.
- Checkpoint: `npm run build` passes clean, zero TypeScript errors.
- **Flagged for a real smoke test once Neon is live (Step 7)** — these two are raw-SQL dialect
  translations, not mechanical type conversions, and were never run against a live Postgres
  instance: employee/task code generation (`ETSK-`/`EMP-`/etc. sequences via `codeGenerator.ts`),
  and the `/kpi-engine/top-delayed-projects` + `/kpi-engine/cost-breakdown` endpoints.
- Not yet removed (optional, deferred to Step 9): `better-sqlite3` / `@types/better-sqlite3` are
  still listed in `server/package.json` but nothing in `src/` imports them anymore.

## Step 4 — Generate fresh migrations against Neon (done)

- [x] Archived the old SQLite migrations to `server/drizzle-sqlite-archive/` (kept, not
      deleted, in case they're ever needed for reference) and cleared `server/drizzle/`
- [x] Ran `drizzle-kit push` against the Neon `DATABASE_URL` (from `.env.local`) — created
      all tables fresh, empty, on Postgres
- Checkpoint (passed): queried `information_schema.tables` on Neon — **56 tables**, matching
  the schema file count exactly (roles, departments, employees, users, projects, tasks,
  tickets, journal_entries, stock_items, etc. all present).

## Step 5 — Migrate data from SQLite to Postgres (done)

- [x] Wrote `server/scripts/migrate-sqlite-to-pg.ts` — opens `dev.db` read-only, inserts into
      Neon in the FK-safe order computed by topologically sorting the real FK graph pulled from
      Postgres `information_schema` (not hand-guessed), auto-detects `boolean` and `timestamp`
      columns from Neon's schema and coerces SQLite's `0/1` and unix-epoch-seconds accordingly,
      and resets every `serial` sequence to `MAX(id)` afterward (skipping junction tables with no
      `id` column, e.g. `role_permissions`, `user_roles`).
- [x] First run failed at the very last step — sequence reset queried `pg_get_serial_sequence(t,
      'id')` unconditionally, which errors on tables with no `id` column. All 685 data rows had
      already inserted successfully by that point; fixed the script to check for an `id` column
      first, then wiped Neon (`TRUNCATE ... RESTART IDENTITY CASCADE` on all 56 tables) and
      re-ran clean from empty.
- [x] Second run: **685/685 rows migrated across all 56 tables, zero mismatches**, sequences
      reset cleanly.
- Checkpoint (passed): script's own summary confirms source count == inserted count for every
  table.

## Step 6 — Verify data integrity (done)

- [x] Row counts: confirmed by the migration script's own per-table summary (685/685, see
      Step 5) — also independently matches the manual SQLite counts taken before migration
      started.
- [x] Spot-checked 3 known employees from `CREDENTIALS.local.md` by email (`syed.shujaat.ali`,
      `shehbaz.ahmed`, `mohammad.tariq.zubair.khan`) — all present on Neon with matching ids,
      `contact_type`, `is_active`.
- [x] Verified `created_at` timestamp conversion: SQLite epoch-seconds `1787146908` → Postgres
      `2026-08-19T13:41:48.000Z` — correct.
- [x] **Verified a migrated password hash still validates**: bcrypt-compared
      `shehbaz.ahmed@demo123` (from `CREDENTIALS.local.md`) against the migrated
      `password_hash` on Neon — passed. Login will work once the app points at Neon.
- [x] FK integrity: 0 orphaned `employees.department_id`, 0 orphaned `users.employee_id`, 0
      orphaned `role_permissions` (checked both sides of the junction table).
- Rollback point (unused): verification passed on the first post-fix run, no need to wipe/retry.

## Step 7 — Switch the app over (local done; render.yaml still pending)

- [x] Updated `server/.env` to point `DATABASE_URL` at the Neon connection string instead of
      `file:./dev.db`
- [x] Restarted the server — `/api/v1/ready` returns `{"status":"ready"}` (live DB round-trip
      through the app, not just the earlier standalone connection test)
- [x] Smoke-tested login with two real seeded accounts (`shehbaz.ahmed@erp.local`,
      `syed.shujaat.ali@erp.local`, both from `CREDENTIALS.local.md`) — both returned valid
      JWTs with correct roles/permissions
- [x] Exercised real endpoints with an authenticated token: `GET /api/v1/projects` (joins
      resolve), `GET /api/v1/employees` (departmentName/roles joins resolve), `GET
      /api/v1/tickets`
- [x] **Specifically re-verified the two raw-SQL translations flagged as risky in Step 3**,
      against live Postgres:
      - `GET /api/v1/kpi-engine/cost-breakdown` → real aggregated totals, correct
      - `GET /api/v1/kpi-engine/top-delayed-projects` → `[]`, confirmed correct by checking
        actual `forecast_finish` dates (all in Oct/Nov 2026, today is 2026-08-20 — nothing
        overdue yet, so empty is the right answer, not a broken query)
      - `POST /api/v1/tickets` → generated `ticketCode: "TCK-004"` correctly incrementing
        from the 3 migrated tickets, confirming the `SUBSTRING`-based `nextCode()` translation
        works on Postgres. Test ticket deleted after verification.
- [ ] Update `render.yaml`: remove the SQLite `disk` block, set `DATABASE_URL` to the Neon
      connection string (as a Render secret, `sync: false`) — **not done yet**, deploy is a
      separate step the user should confirm before touching production config
- Checkpoint: local app fully functional against Neon — passed.

## Step 8 — Deploy

- [ ] Push `render.yaml` + code changes, deploy to Render
- [ ] Confirm production API boots and connects to Neon (`healthCheckPath` passes)
- [ ] Smoke-test login against production URL

## Step 9 — Cleanup (only after Step 8 is confirmed stable)

- [ ] Keep `server/dev.db` and the backup around for at least a few days as a safety net
- [ ] Once confident, `better-sqlite3`-specific code paths can be removed if no longer
      needed for local dev (optional — many teams keep SQLite for local dev and Postgres
      for prod, in which case this step is skipped entirely)

---

## Rollback plan at any point before Step 8

Nothing destructive happens to `server/dev.db` until Step 7 changes which database the
running app points to. Until then, rolling back = just don't switch `DATABASE_URL`.
After Step 7/8, rollback = point `DATABASE_URL` back at `file:./dev.db` (or restore the
Step 1 backup if `dev.db` was itself modified).
