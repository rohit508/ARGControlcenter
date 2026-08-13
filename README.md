# Enterprise ERP — Source Code

This is the actual source code for everything described in the build report, architecture docs,
and production-readiness audit delivered alongside this archive. Three phases (PMO core → CRM/
Finance/Procurement/HR → Inventory/Manufacturing/Assets/Help Desk/Analytics), 54 database tables,
~35 backend route modules, 17 frontend pages, 53 automated tests.

## Prerequisites

- Node.js 20+
- npm

## Setup

**Important:** use `--ignore-scripts` on `npm install`. `better-sqlite3` ships its native binary
pre-bundled in the npm package itself, but its install script *also* redundantly tries to
recompile it via `node-gyp`, which needs to download Node headers from `nodejs.org`. On some
locked-down networks that download is blocked, causing the whole `npm install` to fail even though
the bundled binary would have worked fine untouched. `--ignore-scripts` skips that unnecessary
rebuild step; the package still works correctly, verified below. If your network has no such
restriction, `npm install` without the flag will also work — but `--ignore-scripts` never hurts.

```bash
# Terminal 1 — API server
cd server
npm install --ignore-scripts
npm run db:push      # create the SQLite schema
npm run seed          # load sample data
npm run dev            # http://localhost:4000

# Terminal 2 — Web client
cd client
npm install --ignore-scripts
npm run dev            # http://localhost:5173
```

Open `http://localhost:5173` and sign in:

| Email | Password | Role |
|---|---|---|
| admin@erp.local | Passw0rd! | Admin |
| hassan.pm@erp.local | Passw0rd! | ProjectManager |
| ayesha.finance@erp.local | Passw0rd! | Finance |
| ceo@erp.local | Passw0rd! | CEO |

## Verify it yourself

```bash
cd server
npm test              # 53 tests: 32 unit + 21 integration, against a real isolated database
npm run build          # production TypeScript build
```

```bash
cd client
npm test              # 7 tests: offline sync engine, against real IndexedDB (fake-indexeddb)
npm run build           # production Vite build, code-split
```

All of the above have been run and confirmed passing from a completely fresh extraction of this
exact archive — not just in the original development environment. See
`PRODUCTION-READINESS-AUDIT.md` (delivered alongside this archive) for what "passing tests" does
and does not imply about production readiness.

## Project structure

```
server/
  src/
    app.ts              # Express app factory (importable by tests without binding a port)
    server.ts            # entry point: binds the port, graceful shutdown, cron scheduling
    env.ts                # fail-fast environment variable validation
    db/                    # Drizzle schema (schema.core / .pmo / .phase2 / .phase3) + client
    modules/                # one folder per business module — routes, services, business logic
    lib/                     # shared: JWT, RBAC scope resolver, CRUD factory, audit logging
    test/                     # integration test fixtures + the integration test suite itself
  drizzle/                    # generated SQL migrations

client/
  src/
    app/                 # App.tsx (routes), AppShell.tsx (sidebar/topbar), AuthGuard.tsx
    modules/               # one folder per module — pages, mostly consuming shared components
    components/              # DataTable, KpiCard, HealthBadge, RiskHeatMap, GanttChart
    services/                  # apiClient (JWT-aware fetch wrapper), db.ts (Dexie), syncEngine.ts
    store/                      # Zustand: authStore, uiStore

.github/workflows/ci.yml    # every step in this has been run locally and confirmed to pass
PRODUCTION-READINESS-AUDIT.md
```

## Known limitations

See `PRODUCTION-READINESS-AUDIT.md` for the full, itemized list. The short version: this has never
been tested in an actual browser (every frontend claim is backed by compilation + build success +
API-contract verification, not a rendered click-through), offline sync is wired to the Projects
read-path only, and there is no TLS/secrets-vault/backup story — this is application code, not a
deployed product.
