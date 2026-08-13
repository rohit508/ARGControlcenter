# ERP Project — Tech Stack & Setup Guide

This is a **two-service monorepo**: a React frontend (`client/`) and a Node/Express backend (`server/`), each run independently.

```
erp-source-code/
  README.md
  PRODUCTION-READINESS-AUDIT.md
  server/   ← Node/Express/TypeScript API
  client/   ← React/Vite SPA
```

## Backend — `server/`

| | |
|---|---|
| Runtime | Node.js 20+, TypeScript 5.5.3 (CommonJS) |
| Framework | Express 4.19.2 |
| ORM/DB | Drizzle ORM 0.45.2 + `better-sqlite3` (SQLite file DB) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Validation | Zod |
| Other | `helmet`, `express-rate-limit`, `cors`, `node-cron`, `exceljs`, `multer` |
| Tests | Vitest + Supertest (53 tests) |

- Schema lives across `server/src/db/schema.core.ts`, `.pmo.ts`, `.phase2.ts`, `.phase3.ts` — ~54 tables total.
- ~24 domain modules under `server/src/modules/` (auth, projects, tasks, finance, CRM, HR, inventory, manufacturing, assets, helpdesk, analytics, etc.).
- Drizzle config: `server/drizzle.config.ts`, migrations output to `server/drizzle/`.
- `server/.env` is committed with dev defaults:
  ```
  NODE_ENV=development
  DATABASE_URL="file:./dev.db"
  JWT_ACCESS_SECRET="dev-access-secret-change-in-production"
  JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
  PORT=4000
  CORS_ORIGINS="http://localhost:5173"
  ```

## Frontend — `client/`

| | |
|---|---|
| Runtime | TypeScript 5.5.3, ES modules |
| Framework | React 18.3.1 + Vite 5.4.3 |
| Routing | React Router 6.26.2 |
| Styling | Tailwind CSS 3.4.10 |
| Data/state | TanStack Query 5.59, Zustand 4.5.5 |
| Offline | Dexie 4.0.8 (IndexedDB) for local cache/sync |
| Charts | Recharts |
| Tests | Vitest + fake-indexeddb (7 tests) |

Talks to the backend via `client/src/services/apiClient.ts`, with an offline-sync layer (`services/db.ts`, `syncEngine.ts`) currently only wired for the Projects read path.

## How to Run

Prerequisites: **Node.js 20+** and npm.

### 1. Start the backend (port 4000)

```powershell
cd server
npm install --ignore-scripts
npm run db:push
npm run seed
npm run dev
```

`--ignore-scripts` avoids a redundant native rebuild of `better-sqlite3` and is what CI uses.

### 2. Start the frontend (port 5173), in a separate terminal

```powershell
cd client
npm install --ignore-scripts
npm run dev
```

Then open **http://localhost:5173**. See `README.md` for seeded login credentials (e.g. `admin@erp.local` / `Passw0rd!`).

## Tests & Build

- `server`: `npm test`, `npm run build`
- `client`: `npm test`, `npm run build`

## CI

`.github/workflows/ci.yml` runs two jobs on Node 20:
- **server**: `npm ci --ignore-scripts` → typecheck → `npm test` → `npm run db:push` + `npm run seed` (smoke test) → `npm run build`
- **client**: equivalent typecheck/test/build

## Known Limitations

Per `PRODUCTION-READINESS-AUDIT.md`: never manually tested in a real browser, offline sync only wired for the Projects read-path, no TLS/secrets-vault/backup story. Treat this as dev-stage, not production-ready.
