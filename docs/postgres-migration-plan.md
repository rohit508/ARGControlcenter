# SQLite → PostgreSQL (Neon) Migration Plan

**Status:** All 9 steps done. Live in production on Railway (not Render — see note below),
connected to Neon, verified end-to-end (readiness check + real login).
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
- [x] Updated `render.yaml`: removed the SQLite `disk` block, `DATABASE_URL` is now
      `sync: false` (set manually in the Render dashboard, not committed), and
      `healthCheckPath` changed from `/api/v1/health` (confirmed 404 — not a real route) to
      `/api/v1/ready` (the real DB-connectivity check).
- Checkpoint: local app fully functional against Neon — passed.

## Step 8 — Deploy (pushed; awaiting manual Render env var + confirmation)

- [x] Generated a real Postgres migration file (`drizzle/0000_spooky_rhodey.sql`, via
      `drizzle-kit generate`) — the old SQLite migrations
      (`0000_chunky_secret_warriors.sql`, `0001_silly_alice.sql`) were archived in Step 4,
      not deleted, and now fully replaced in `server/drizzle/`.
- [x] Decided deploy migration strategy: `drizzle-kit push` (non-destructive, diffs schema and
      only adds what's missing, never drops/truncates) rather than a journal-tracked
      `drizzle-kit migrate` — chosen because Neon's tables already exist from Step 4's manual
      push and there's no migrations-journal table to reconcile against. Verified locally:
      running `db:push` against the already-up-to-date Neon schema exits 0 with no prompt in
      non-interactive mode (confirms it won't hang or require confirmation on Render).
- [x] Rewrote `server/scripts/deploy-start.sh` for Postgres: runs `db:push`, then seeds only if
      `users` has zero rows (checked via new `server/scripts/has-existing-data.ts`, since
      there's no local file to stat against a remote Postgres like the old SQLite version did).
      Verified `has-existing-data.ts` correctly detects the 70 existing migrated users on Neon
      (exit 0 = skip seed).
- [x] Added `server/backups/` and `server/drizzle-sqlite-archive/` to `.gitignore` (the SQLite
      backup binary and archived migrations shouldn't be committed).
- [x] Committed (`1888a50`) and pushed to `origin/main`.
- **Platform change: deployed on Railway, not Render.** Render's free tier started requiring
  card verification for a new web service (unexpected — `render.yaml`'s `plan: free` implied
  otherwise) and the user chose not to hand over card details for a free tier. The repo already
  had working `server/railway.json` / `client/railway.json` from a prior Railway deployment of
  this same project, so we switched platforms instead. `render.yaml` is left in the repo
  as-is (harmless, unused) in case Render is revisited later — nobody should assume it's
  actively deployed from it.
- [x] Created a new Railway project (`modest-rebirth` workspace), connected
      `rohit508/ARGControlcenter`, root directory `server` — Railway auto-used the existing
      `server/railway.json` (build: `npm install --include=dev && npm run build`, start:
      `sh scripts/deploy-start.sh`, already Postgres-compatible from Step 8's script rewrite).
- [x] Set 5 env vars manually in Railway's Variables tab: `DATABASE_URL` (Neon connection
      string), `CORS_ORIGINS`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`.
- [x] **First deploy crashed** — `DATABASE_URL` was left at Railway's own auto-added
      `file:./dev.db` default (Railway pre-populates some vars itself; this one wasn't ours and
      wasn't caught before first deploy). Fixed by editing the variable to the real Neon URL.
- [x] **Second deploy went "Active" but returned 502** on every request. Deploy logs showed the
      server actually booted fine (`ERP API listening on :8080`, DB connected, seed correctly
      skipped since the 70 migrated users were found) — but every request then crashed with
      `ValidationError: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` from `express-rate-limit`. Root
      cause: Railway (like Render) sits in front of the app as a reverse proxy and adds
      `X-Forwarded-For`, but Express's `trust proxy` setting defaults to `false` — with it off,
      `express-rate-limit` refuses to trust that header and throws on every single request.
      Fixed in `server/src/app.ts`: `app.set("trust proxy", 1)` in production (trusting exactly
      1 hop, not unlimited, so a client still can't spoof their own IP via a fake
      `X-Forwarded-For` chain). Committed (`42d7a37`) and pushed — this was a real app-code bug
      that would have hit Render identically, not a Railway-specific issue.
- [x] **Third deploy: confirmed working end-to-end.**
      `curl https://argcontrolcenter-production.up.railway.app/api/v1/ready` →
      `{"status":"ready"}`. Login tested with a real seeded account
      (`syed.shujaat.ali@erp.local`) → valid JWT, correct roles (`Admin`, `CEO`), full
      permission set returned. **Production is live on Neon.**

## Step 9 — Cleanup (optional, not yet done)

- [ ] Keep `server/dev.db` and the backup around for at least a few days as a safety net before
      considering deleting either.
- [ ] `better-sqlite3` / `@types/better-sqlite3` are still listed in `server/package.json` but
      unused by `src/` — can be removed once confident, or kept if SQLite is still wanted for
      local dev alongside Postgres in production. Not urgent either way.
- [ ] `render.yaml` could be deleted or updated to match the Railway setup if Render is
      definitively not going to be used — currently left alone since it's inert either way.

---

## Rollback plan at any point before Step 8

Nothing destructive happens to `server/dev.db` until Step 7 changes which database the
running app points to. Until then, rolling back = just don't switch `DATABASE_URL`.
After Step 7/8, rollback = point `DATABASE_URL` back at `file:./dev.db` (or restore the
Step 1 backup if `dev.db` was itself modified).
