# Production Readiness & Security Audit

Written from the perspective of the engineer who'd actually be on call for this in production —
every item below is either verified working (with the evidence noted) or explicitly flagged as
not yet done. Nothing in this document should be read as "secure" or "ready" unless it says so.

## How to read this document

- **Verified** — implemented and confirmed working via an automated test or a specific manual check, cited inline.
- **Partial** — some protection exists but has a known limitation.
- **Not done** — does not exist. Required before a real production launch, not optional polish.

## 1. Authentication & session management

| Item | Status | Evidence / gap |
|---|---|---|
| Password hashing | Verified | bcrypt, cost factor 10 |
| JWT access tokens | Verified | 15-minute expiry, signed with a validated >=16-char secret, unique `jti` per token (`src/lib/jwt.ts`) |
| Refresh token rotation | Verified | Old token revoked on use; confirmed in `integration.test.ts` - "refresh token rotation issues a new access token" |
| Rate limiting on login | Verified | 10 attempts / 15 min per IP; confirmed to block even a *correct* password once tripped (`integration.test.ts` - "Auth rate limiting") |
| Account lockout after N failures | Not done | Rate limiting slows brute force but doesn't lock the account itself. A real product needs both. |
| Multi-factor authentication | Not done | Not implemented at all. |
| Password complexity / breach-list checking | Not done | No registration endpoint exists yet (users are seeded), so this has never been exercised. Needed before self-service signup ships. |
| Session/device management (view & revoke active sessions) | Not done | Refresh tokens are revocable one-by-one in the DB, but there's no UI or endpoint to list/revoke a user's active sessions. |

## 2. Authorization

| Item | Status | Evidence / gap |
|---|---|---|
| RBAC, DB-backed (not hardcoded) | Verified | Employee blocked from creating a project (403), ProjectManager allowed, Finance blocked from Projects but allowed on Budget - all in `integration.test.ts` |
| Row-level scoping (who sees which projects) | Partial | Implemented for Projects (`scopeResolver.ts`) but not extended to every other module (Tasks/Risks/etc. scope through project_id indirectly, not independently tested) |
| Multi-step workflow approval enforcement | Verified | Wrong-role approval attempt blocked (403), correct multi-step sequence succeeds, a second action on an already-terminal workflow is rejected (409) |
| Audit log completeness | Partial | Every service-layer mutation writes to `audit_log`, but this is enforced by convention (each service remembering to call `writeAudit`), not by a mechanism that would fail loudly if a new module forgot to. |

## 3. Input handling & injection

| Item | Status | Evidence / gap |
|---|---|---|
| SQL injection | Verified | Structurally prevented - 100% of queries go through Drizzle's parameterized query builder; the few raw `sql` template usages (KPI aggregation) use tagged-template parameterization, not string concatenation |
| Request body validation | Verified | Zod schema at every mutation endpoint; malformed input returns 400 with a field-level message, not a 500 |
| XSS | N/A currently | No rich-text rendering exists anywhere in the frontend yet (checked directly: no `dangerouslySetInnerHTML` in the codebase). This is not a false sense of security - it means the question hasn't been tested, because the feature that would need sanitizing doesn't exist yet. |
| File upload validation | Not done | The `attachments` table and polymorphic association exist in the schema; no upload endpoint has actually been built, so there's no MIME-type/size validation to audit yet. |
| CSRF | Verified (by design) | JWT sent as `Authorization: Bearer`, never a cookie - this removes the CSRF attack surface structurally rather than requiring a token-matching mitigation |

## 4. Network & infrastructure

| Item | Status | Evidence / gap |
|---|---|---|
| Security headers (helmet) | Verified | Confirmed via curl: HSTS, X-Content-Type-Options, X-Frame-Options present |
| CORS | Verified | Allowlist-based, not wildcard; confirmed a disallowed origin gets no CORS header while the configured origin does |
| Environment secret validation | Verified | Boot refuses to start with a missing secret, a secret under 16 characters, or (in `NODE_ENV=production`) a known dev-placeholder secret - all three scenarios verified directly |
| HTTPS / TLS termination | Not done | Not configured - this app has never been deployed behind a real reverse proxy or load balancer. HSTS header is set, but there's no TLS termination to actually enforce. |
| Secrets management (vault/KMS) | Not done | Secrets live in a `.env` file today. Fine for local dev, not acceptable for production - needs a real secrets manager before launch. |
| Database encryption at rest | Not done | SQLite file is unencrypted on disk. Acceptable for a dev/demo deployment; not for handling real customer financial/HR data. |
| Health vs. readiness separation | Verified | `/health` never touches the DB (liveness); `/ready` does a real `SELECT 1` (readiness) - the distinction an orchestrator needs to avoid killing a healthy-but-DB-degraded instance |
| Graceful shutdown | Verified | SIGTERM/SIGINT close the HTTP server before the DB handle, with a 10s force-exit timeout as a safety net |

## 5. Data integrity

| Item | Status | Evidence / gap |
|---|---|---|
| Double-entry accounting validation | Verified | Unbalanced journal entries rejected with the exact imbalance amount in the error; verified via both curl and an automated test |
| Soft delete | Verified | Enforced centrally by the CRUD factory for every table with a `deletedAt` column - not per-module code that could be forgotten |
| Negative-stock prevention | Verified | An over-issue transaction is rejected with the exact shortfall reported |
| BOM/production atomicity | Verified | Pre-flight-checks every component before issuing any of them, so a shortage on line 3 can't leave lines 1-2 already consumed - verified with a multi-line shortage test |
| Database backup / point-in-time recovery | Not done | No backup mechanism exists. For SQLite this is close to "copy the file," but nothing automates it, tests the restore path, or runs on a schedule. |
| Migration rollback strategy | Not done | Drizzle migrations are forward-only as configured; no tested rollback procedure exists. |

## 6. Testing & CI

| Item | Status | Evidence / gap |
|---|---|---|
| Unit tests for core business logic | Verified | 32 tests: EVM/health calculations, depreciation, BOM shortage planning, SLA status |
| Automated integration tests | Verified | 21 tests via supertest against the real Express app and an isolated SQLite database - auth, RBAC, EVM recalculation chain, workflow engine, double-entry validation, rate limiting, error handling |
| CI pipeline | Verified | `.github/workflows/ci.yml` - every step in it has been run locally command-for-command and confirmed to pass (not just YAML that looks plausible) |
| Frontend UI testing | Not done | Zero browser-based tests (no Playwright/Cypress). Every frontend claim in this project is backed by TypeScript compilation + production build success + API-contract verification - never by an actual rendered click-through. |
| Load/performance testing | Not done | Never run. No data on how this holds up past the ~50-100 seed rows used for verification. |
| Penetration testing | Not done | This document is a self-audit against a checklist, not a real third-party pentest. Treat it accordingly. |

## Priority if this were shipping next quarter

**Must fix before any real customer data touches this:**
1. Secrets management (real vault, not `.env`)
2. TLS/HTTPS termination
3. Database backup + tested restore procedure
4. Account lockout policy (on top of existing rate limiting)
5. A real penetration test by someone who isn't the system's own author

**Should fix soon after:**
6. Row-level scoping extended to every module, not just Projects
7. File upload validation (once an upload endpoint exists)
8. Frontend browser-based test coverage
9. Load testing at realistic data volumes

**Reasonable to defer:**
10. MFA, session management UI - valuable, not launch-blocking for a first customer
