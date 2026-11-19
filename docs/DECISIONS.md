# Decision log, assumptions, risks and open questions

## Modernization: 2026-11-19 (supersedes conflicting entries below)

| # | Decision | Reason |
|---|---|---|
| ADR-018 | **npm workspaces monorepo**: `packages/shared` holds zod schemas, roles/permissions, curriculum reference structure and the marking engine, used by both API and web | One definition of every request/response; the browser validates forms with the same schema the API enforces; offline practice can auto-mark on the device |
| ADR-019 | **OpenAPI from zod** (`fastify-type-provider-zod` + `@fastify/swagger`) → `openapi-typescript` → typed `openapi-fetch` client | API/frontend drift becomes a compile error |
| ADR-020 | **Better Auth** replaces hand-rolled auth: HttpOnly session cookie, username login for learners, email login for adults, email verification, password reset, TOTP two-factor and passkeys, built-in rate limiting. Public sign-up is disabled; our registration endpoints create accounts so roles and consent are always recorded | Maintained, audited library; passkeys/2FA for adults |
| ADR-021 | **CASL policies** for authorization (roles + relationships), plus **PostgreSQL row-level security in production** (`asUser`, migration `rls_policies`) as a second layer | A bug in one layer can't leak a child's records |
| ADR-022 | **Database: SQLite in development, PostgreSQL in production** (owner decision). `prisma/schema.prisma` is the single source; `scripts/sync-schemas.mjs` generates `prisma/postgres/schema.prisma`; each provider has its own migrations; `prisma.config.ts` picks by `DATABASE_URL`. CI runs the full suite on **both**. Supersedes the PGlite idea and ADR-012. | No local database server to install; production keeps Postgres features |
| ADR-023 | **Job queue in the database** (`jobs` table, atomic claim, retries with backoff) instead of Redis/BullMQ or pg-boss | Works on SQLite and PostgreSQL, nothing extra to operate |
| ADR-024 | **Offline-first PWA**: Dexie (IndexedDB) for downloaded lessons and an **answer outbox** replayed on reconnect; the API's answer save is an idempotent upsert and the **server deadline** decides lateness; on-device data is cleared on sign-out | Patchy connectivity on mid-range Android phones |
| ADR-025 | **Spaced repetition (FSRS via ts-fsrs)** per learner × topic, updated from real marked results | Evidence-based "revise today" lists |
| ADR-026 | **AI with a human in charge**: hints only in practice (never exams), grounded in our own lesson notes (Claude Haiku 5.5); essay **marking suggestions** for teachers with structured output (Claude Sonnet 5.5), clamped to the marking scheme, never written as a score. No names or emails sent; every call logged in `ai_interactions`; both features off until an admin enables them | Kenya DPA and fairness to learners |
| ADR-027 | **Hosting: Render (Frankfurt)** via `render.yaml` (static PWA + API + worker + managed PostgreSQL). Alternative: Docker Compose + Caddy on a VPS (`deploy/`) when data must stay in Kenya | Vercel can't run the always-on API/worker the platform needs |
| ADR-028 | **Seeding split**: `seed-production.ts` (idempotent reference data + first admin from env vars, safe on every deploy) vs `seed.ts` (demo data, refuses to run in production) | Production gets a ready system with no fake users |

## Stack revision: 2026-11-19 (supersedes the Laravel choices below)

At the owner's request (no PHP, Linux or WSL tooling on the Windows dev machine):

| # | Decision | Reason |
|---|---|---|
| ADR-011 | **Backend: Node.js + TypeScript + Fastify** replaces Laravel | Node is already installed. Fastify needs no decorator metadata (NestJS does), so it runs with `tsx` without a compile step. Code stays modular under `backend/src/modules/*`. |
| ADR-012 | **ORM: Prisma 7** with driver adapters. **SQLite in development, PostgreSQL in production.** The schema uses only the portable subset (no `@db.*` native types). | The owner chose SQLite for dev. Production switches `provider` to `postgresql` and uses `@prisma/adapter-pg`. **Risk:** tests run on SQLite; behaviour such as case-insensitive search and locking differs, so a PostgreSQL CI job is required before go-live. |
| ADR-013 | **Auth: server-side sessions in an HttpOnly, Secure, SameSite=Lax cookie**, with CSRF protection on state-changing requests. This replaces Sanctum (same security model as ADR-003). | Keeps tokens out of JavaScript |
| ADR-014 | **RBAC: roles, permissions and pivots in our own tables**, with scoped checks (parent-child, teacher-class) in per-module policy functions | Replaces spatie/laravel-permission (ADR-005) |
| ADR-015 | **Password hashing: Node's built-in scrypt** (N=2^15, r=8, p=1, 16-byte salt). The format string stores its parameters for future upgrades. | Memory-hard; no native add-on to compile on Windows |
| ADR-016 | **Frontend is a Progressive Web App** (vite-plugin-pwa / Workbox): installable, precached app shell, offline fallback, update prompt. **API responses are never cached by the service worker** because they contain private learner data. | Mobile-first audience with intermittent connectivity |
| ADR-017 | Dev ports: **frontend 5000** (Vite, proxies `/api`), **API 4000** | Owner request |

ADR-001 (modular monolith), ADR-002 (modules), ADR-004 (curriculum model), ADR-006 (data minimization), ADR-007 (payments), ADR-009 (sanitization) and ADR-010 (money) still apply. ADR-003, ADR-005 and ADR-008 are superseded as described above.

## Original architectural decisions (ADRs)

| # | Decision | Reason | Status |
|---|---|---|---|
| ADR-001 | Modular monolith: Laravel API in `backend/`, React SPA in `frontend/`, one repository | Required by the brief; simplest to deploy on a single VPS | Accepted |
| ADR-002 | Code is organized by business module under `app/Modules/*` (backend) and `src/features/*` (frontend) | Keeps the domains separable and testable | Accepted |
| ADR-003 | Same-origin deployment with Sanctum **cookie** SPA auth, not bearer tokens in localStorage | HttpOnly cookies are not readable by injected scripts; CSRF is handled by Sanctum | Accepted |
| ADR-004 | Curriculum uses fixed tables (`units` → `topics` → `learning_objectives`) plus a **self-referencing `academic_levels` tree** and **per-curriculum display labels** (CBC shows "Strand / Sub-strand / Learning outcome") | Handles different depths (IGCSE has no grades; CBC has stage → grade) without a fully generic tree, which would make reporting queries much harder | Proposed: tell me if you'd rather have a fully generic tree |
| ADR-005 | spatie/laravel-permission for RBAC; scoped access (parent-child, teacher-class) in Policies | Mature, tested; scoping is domain logic, not just roles | Accepted |
| ADR-006 | Data minimization for learners: no full date of birth (year and month only), no learner phone number, email optional for young learners (username login), parent consent recorded in `consents` | Kenya Data Protection Act 2019, s.33 (processing children's data needs parental consent and must be in the child's interest) | Accepted |
| ADR-007 | Payments and subscriptions are separate tables; activation happens only after server-side provider verification inside a DB transaction; callbacks are idempotent through a unique key | Required by the brief; prevents double-activation and spoofing | Accepted |
| ADR-008 | Locally on Windows, Redis is replaced by the `database` cache and queue drivers; production uses Redis | No supported Redis build for Windows; the code is driver-agnostic | Proposed |
| ADR-009 | Rich text stored as HTML, sanitized server-side with HTMLPurifier on write | XSS protection for content editors and teacher feedback | Accepted |
| ADR-010 | Money stored as integer minor units plus an ISO 4217 currency code (KES default) | Avoids floating-point errors | Accepted |

## Assumptions

1. Primary currency is **KES**. A plan may be priced in another currency for card payments.
2. A **parent** usually pays and holds the subscription; one subscription can cover several linked children. Older learners may also self-subscribe.
3. **Decided (2026-11-19):** learners under 18 self-register, but the account stays in a limited `pending_guardian` state (profile setup and public previews only, with no tracked learning data or assessments) until a parent confirms the link and gives consent by email. Learners who declare an age of 18 or over are activated directly.
4. Teachers are created or invited by an admin and do not self-register.
5. English is the only UI language at launch.
6. The platform supplies **original** content written by Elite Revision editors. Curriculum *structure* (stage and grade names, subject names) is seeded; official syllabus text and past papers are not, unless licensed.
7. "Termly" means a fixed number of days set by the admin (default 120), not tied to school calendar dates.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Dev machine is Windows 10 1909 (end of life), not Kali; virtualization is disabled | Dev and prod differ; unpatched OS | Match PostgreSQL and PHP majors to prod; run CI on Linux; consider enabling virtualization for WSL2 |
| Truehost plan may be shared hosting (no root, no Redis, no Supervisor, MySQL only) | Architecture cannot be deployed as designed | Confirm a VPS before Phase 8; fallbacks are the database queue driver plus a cron-driven `queue:work --stop-when-empty` |
| M-Pesa Go-Live approval takes time and needs a registered paybill or till number | Live payments delayed | Build and test against the sandbox; start the Go-Live paperwork early |
| Stripe does not onboard Kenya-registered merchants directly | Card gateway choice | Use a Kenya-supporting gateway (Paystack, Pesapal, Flutterwave, or DPO); see Q2 |
| Children's personal data | Legal and reputational | ODPC registration, a data protection impact assessment, consent records, minimization, encryption in transit, audit logs, retention policy |
| Use of "Cambridge" and "CBC" names and curriculum content | IP and trademark | Disclaimer of no affiliation; original content only; legal review of the marketing copy |
| Scope size | Schedule | Strict phase gates; each phase delivers working, tested features |

## Open questions (need your answer before the relevant phase)

| # | Question | Needed by |
|---|---|---|
| Q1 | Toolchain on this machine: native Windows install, WSL2, or a separate Kali machine? | **Now (Phase 0)** |
| Q2 | Card gateway: Paystack, Pesapal, Flutterwave, DPO or other? Do you already have a merchant account? | Phase 6 |
| Q3 | M-Pesa: Paybill or Till (Buy Goods)? Already registered? | Phase 6 |
| Q5 | Is Elite Revision a registered company (for ODPC registration, invoices and KRA PIN on receipts)? Is VAT applied to subscriptions? | Phase 6 |
| Q6 | Will schools be customers (school accounts with many teachers and classes), or only individual families and independent teachers? | Phase 5 (affects the `classes` ownership model) |
| Q7 | Transactional email provider and SMS provider preference (e.g. Brevo or Mailgun; Africa's Talking)? | Phase 5 |
| Q8 | Is content approval (editor → admin) mandatory, or can editors publish directly? | Phase 3 |
