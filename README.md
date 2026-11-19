# Elite Revision

**Learn. Practise. Prepare. Succeed.**

An online learning and examination-preparation platform for Cambridge International and Kenya CBC learners. It has separate experiences for learners, parents, teachers and administrators.

> Status: **Phase 0 (environment and architecture)**. No application code yet.
> Elite Revision is an independent platform and is not affiliated with or endorsed by Cambridge University Press & Assessment or KICD.

## Repository layout

| Path | Purpose |
|---|---|
| `backend/` | Laravel REST API: auth, RBAC, curriculum, learning, assessments, billing (created in Phase 0) |
| `frontend/` | React + TypeScript + Vite + Tailwind single-page app (created in Phase 0) |
| `deploy/` | Nginx, Supervisor, cron, backup and deployment scripts (Phase 8) |
| `docs/` | Architecture, decisions, environment and deployment requirements |

## Documentation

- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md): inspection of the local environment and recommended versions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system architecture, module boundaries and database design
- [docs/ROADMAP.md](docs/ROADMAP.md): phased implementation plan and acceptance criteria
- [docs/DECISIONS.md](docs/DECISIONS.md): architectural decision log, assumptions, risks and open questions
- [docs/DEPLOYMENT-REQUIREMENTS.md](docs/DEPLOYMENT-REQUIREMENTS.md): what to confirm with Truehost, and the external credentials needed

Local run instructions will be added here once the backend and frontend are scaffolded.
