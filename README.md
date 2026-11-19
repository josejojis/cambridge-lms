# Elite Revision

**Learn. Practise. Prepare. Succeed.**

An online learning and examination-preparation platform for Cambridge International and Kenya CBC learners. It has separate experiences for learners, parents, teachers and administrators.

> Status: **Phase 0 complete; Phase 1 in progress.** Public PWA site, API foundation, full schema (52 tables) and demo seed are done. Authentication and dashboards are next.
> Elite Revision is an independent platform and is not affiliated with or endorsed by Cambridge University Press & Assessment or KICD.

## Repository layout

| Path | Purpose |
|---|---|
| `backend/` | Node.js + TypeScript + Fastify REST API, Prisma ORM (SQLite in dev, PostgreSQL in prod) |
| `frontend/` | React + TypeScript + Vite + Tailwind **Progressive Web App** |
| `deploy/` | Nginx, Supervisor, cron, backup and deployment scripts (Phase 8) |
| `docs/` | Architecture, decisions, environment and deployment requirements |

## Documentation

- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md): inspection of the local environment and recommended versions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system architecture, module boundaries and database design
- [docs/ROADMAP.md](docs/ROADMAP.md): phased implementation plan and acceptance criteria
- [docs/DECISIONS.md](docs/DECISIONS.md): architectural decision log, assumptions, risks and open questions
- [docs/DEPLOYMENT-REQUIREMENTS.md](docs/DEPLOYMENT-REQUIREMENTS.md): what to confirm with Truehost, and the external credentials needed

## Run locally (Windows, Node 24+)

```bash
# 1. API: http://localhost:4000
cd backend
npm install
cp .env.example .env          # then edit SESSION_SECRET / SEED_DEMO_PASSWORD
npx prisma migrate dev        # creates prisma/dev.db (SQLite)
npx prisma generate
npm run db:seed               # wipes and reloads DEMO data (refuses when NODE_ENV=production)
npm run dev

# 2. Web app (PWA): http://localhost:5000  (proxies /api to :4000)
cd frontend
npm install
npm run dev

# Tests
cd backend  && npm test && npm run typecheck
cd frontend && npm test && npm run typecheck
```

To try the PWA with its production service worker (install prompt, offline mode), run `npm run build && npm run preview` in `frontend/`. It also serves on port 5000.

### Demo accounts (test data only)

All use the password set in `SEED_DEMO_PASSWORD` (default `ChangeMe!2026`). Login is enabled in Phase 1.

| Role | Usernames |
|---|---|
| Main Administrator | `admin` |
| Content Editor | `editor` |
| Teacher | `teacher.achieng` (CBC Grade 7 class), `teacher.david` (IGCSE class) |
| Parent | `parent.grace` (Amani + Neema, Premium via M-Pesa), `parent.peter` (Brian; failed and pending payments; Zuri's link request), `parent.priya` (Aisha, Exam Prep via card) |
| Learner | `amani`, `kevin` (CBC G7), `neema` (CBC G4), `brian`, `aisha` (IGCSE), `zuri` (awaiting parent approval) |
