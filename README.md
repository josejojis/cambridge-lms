# Elite Revision

**Learn. Practise. Prepare. Succeed.**

An online learning and examination-preparation platform for Cambridge International and Kenya CBC learners, with separate experiences for learners, parents, teachers and administrators. Delivered as an installable, offline-capable Progressive Web App.

> Status: **foundation + Phase 1 core complete.** Auth (incl. 2FA/passkeys), RBAC with row-level security, parent consent flow, exam engine API with offline autosave, spaced repetition, AI hint and marking-suggestion services, production seed and deployment config are done. Role dashboards (Phase 5), content authoring UI, and payments (Phase 6) are next.
> Elite Revision is an independent platform and is not affiliated with or endorsed by Cambridge University Press & Assessment or KICD.

## Stack

| Layer | Technology |
|---|---|
| Web app | React 19, TypeScript, Vite 8, Tailwind 4, TanStack Query, PWA (Workbox), Dexie offline store, i18next (English/Kiswahili) |
| API | Node 24+, Fastify 5, zod → OpenAPI, Better Auth, CASL |
| Data | Prisma 7: **SQLite in development**, **PostgreSQL 17 in production** (with row-level security) |
| Jobs | Database-backed queue + worker process |
| AI | Claude (Anthropic SDK): Haiku 5.5 hints, Sonnet 5.5 marking suggestions; off by default |
| Ops | Render blueprint (`render.yaml`) or Docker Compose + Caddy (`deploy/`), GitHub Actions CI (SQLite and PostgreSQL), Sentry, Renovate |

## Repository layout

| Path | Purpose |
|---|---|
| `packages/shared/` | zod schemas, roles and permissions, curriculum reference structure, marking engine |
| `backend/` | API (`src/modules/*`), worker (`src/worker.ts`), Prisma schema, migrations and seeds |
| `frontend/` | PWA (`src/features/*`), offline store, typed API client, Playwright e2e tests |
| `deploy/` | Dockerfile, production Compose stack, Caddyfile |
| `docs/` | Architecture, decisions (ADRs), roadmap, environment, deployment requirements |

## Run locally (Windows, macOS or Linux, Node 24+)

```bash
npm install                                  # whole workspace
cp backend/.env.example backend/.env         # then set BETTER_AUTH_SECRET (32+ chars)
npm run setup                                # SQLite migrations + client + demo seed
npm run dev                                  # API :4000, worker, web http://localhost:5000
```

Tests and checks: `npm test` (all packages), `npm run typecheck`, `npm run test:e2e -w frontend` (Playwright, phone and desktop).

To try the production service worker (install prompt, offline mode): `npm run build -w frontend && npm run preview -w frontend`.

### Database workflow

- Edit **only** `backend/prisma/schema.prisma`.
- `npm run db:migrate -w backend -- --name <change>` creates and applies the SQLite migration.
- `npm run db:migrate:postgres -w backend -- <change>` creates the matching PostgreSQL migration (no Postgres server needed).
- Commit both migration folders. CI applies the PostgreSQL ones to a real PostgreSQL and runs the full suite.

### Seeds

| Command | What it does | Where |
|---|---|---|
| `npm run db:seed:production -w backend` | Idempotent reference data: roles, permissions, full Cambridge and CBC structure (40 levels, 205 subject offerings), 36 subjects, settings, inactive plan templates, first admin from `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | Every environment; runs automatically on each Render deploy |
| `npm run db:seed -w backend` | Wipes the database, then reference data + demo users, content, attempts, payments (all flagged as test data) | Development and CI only (refuses in production) |

### Demo accounts (development seed only)

Password: `SEED_DEMO_PASSWORD` (default `ChangeMe!2026`). Learners sign in with a username; adults can use the username or email (`<username>@elite-revision.test`).

| Role | Usernames |
|---|---|
| Main Administrator | `admin` |
| Content Editor | `editor` |
| Teacher | `teacher.achieng` (CBC Grade 7 class), `teacher.david` (IGCSE class) |
| Parent | `parent.grace` (Amani + Neema), `parent.peter` (Brian; approve **Zuri**'s pending request), `parent.priya` (Aisha) |
| Learner | `amani`, `kevin` (CBC G7), `neema` (CBC G4), `brian`, `aisha` (IGCSE), `zuri` (awaiting parent approval) |

## Deployment

See [docs/DEPLOYMENT-REQUIREMENTS.md](docs/DEPLOYMENT-REQUIREMENTS.md) and ADR-027. Short version: create a Render Blueprint from `render.yaml`, then fill in the `sync: false` secrets (admin email and password, Resend key, and optionally Anthropic and M-Pesa sandbox keys). Point `elite-revision.com` DNS at the static site. Nothing is deployed without explicit approval.

## Documentation

- [docs/DECISIONS.md](docs/DECISIONS.md): architecture decisions (ADR-001 to ADR-028), assumptions, risks, open questions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): module boundaries and database design
- [docs/ROADMAP.md](docs/ROADMAP.md): phases and acceptance criteria
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md): local environment inspection
- [docs/DEPLOYMENT-REQUIREMENTS.md](docs/DEPLOYMENT-REQUIREMENTS.md): hosting questions and the credentials needed
