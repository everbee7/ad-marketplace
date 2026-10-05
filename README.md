# Flashd

A marketplace connecting **businesses** and **content creators** through **burst ads**: 0.5–2 second branded clips that creators insert into their own videos.

- Businesses upload burst ads. An admin reviews them, and approved ads go live in a shared Marketplace.
- Creators browse and save ads, upload videos, place bursts on a timeline, preview the combined video in the browser, and save projects.

> **Status:** MVP feature-complete (M0–M8), merged into `staging`, self-hosted on the client's Windows Server (ADR-0007). See [docs/product/ROADMAP.md](docs/product/ROADMAP.md) and [docs/ai/STATE.md](docs/ai/STATE.md).

## Tech stack

Next.js 16 (App Router, TypeScript) · MongoDB + Mongoose · Vercel (hosting, Blob storage, Cron) · Better Auth · Tailwind CSS v4 + shadcn/ui · Vitest + Playwright

Only **two external platforms**, Vercel and MongoDB Atlas. Local development needs **no accounts at all** ([ADR-0005](docs/decisions/0005-lean-service-stack.md)).

Details and rationale: [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md), [docs/decisions/](docs/decisions/README.md).

## Getting started

Prerequisites: Node.js 22+ and npm. Nothing else for local development.

```bash
npm install
cp .env.example .env.local      # local defaults: local DB, local file storage, console email
npm run db:local                # local MongoDB replica set on :27017 (data in .data/mongo); keep it running
npm run seed:demo -- admin@flashd.local adminpass1   # admin + a demo business with 4 live ads
npm run dev                     # http://localhost:3000
```

- Emails (verification, password reset) are printed in the terminal and appended to `.data/mail/outbox.jsonl`.
- Uploaded files are stored in `.data/uploads` and served by `/api/dev-files` (development only).
- Demo logins: `admin@flashd.local` / `adminpass1`, `demo-business@flashd.local` / `demopass1`. Sign up as a creator yourself.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run check` | Lint + typecheck + unit/integration tests (run before every PR) |
| `npm run test:e2e` | Playwright end-to-end tests (builds and starts an isolated production server on :3100) |
| `npm run fixtures:media` | Generate the test media clips (never committed) |
| `npm run db:local` | Local MongoDB, no install |
| `npm run seed:admin -- <email> <password>` | Create an admin (admins can't sign up) |
| `npm run seed:demo -- [adminEmail] [adminPassword]` | Admin + demo business with approved ads |

## Deploying on Windows Server (current, ADR-0007)

Production runs on the client's Windows Server 2025 (`68.168.20.36`, HTTP on port 80 until a domain exists).

| What | Where |
| --- | --- |
| App (git clone of `staging`) | `C:\flashd\app` |
| Settings (secrets; admins only) | `C:\flashd-data\config\flashd.env` |
| Uploaded media | `C:\flashd-data\uploads` |
| Logs | `C:\flashd-data\logs\flashd.out.log` / `flashd.err.log` (also where console emails appear) |
| Windows service | `Flashd` (NSSM) → `node scripts/ops/serve.mjs` |
| Daily cleanup | Task Scheduler `Flashd cleanup` → `node scripts/ops/cron-cleanup.mjs` (04:00) |

Common tasks (PowerShell as Administrator):

```powershell
cd C:\flashd\app
node scripts/ops/deploy.mjs staging         # pull, npm ci, build, restart
nssm restart Flashd                          # restart only
nssm status Flashd
Get-Content C:\flashd-data\logs\flashd.out.log -Tail 50 -Wait
node scripts/ops/with-env.mjs npx tsx --conditions=react-server scripts/seed-admin.ts <email> <password>
```

Before real users: add a domain + HTTPS (e.g. Caddy in front of the app), SMTP settings (`EMAIL_TRANSPORT=smtp`, `SMTP_*`), and more disk for `STORAGE_LOCAL_DIR`.

## Deploying on Vercel + MongoDB Atlas (alternative)

Everything is owned by the client: a Vercel team (Pro plan for Production) and a MongoDB Atlas organisation.

1. **Atlas:** create a `staging` and a `production` cluster (replica sets; transactions are used). Allow Vercel's egress (or 0.0.0.0/0 with a strong password). Copy each connection string.
2. **Vercel project** from this repo. Branches: `staging` → Staging environment, `main` → Production, PRs → Preview.
3. **Vercel Blob:** create one store for Staging/Preview and one for Production; link them so `BLOB_READ_WRITE_TOKEN` is set per environment.
4. **Environment variables** per environment (full table in [ARCHITECTURE §11.1](docs/engineering/ARCHITECTURE.md)): `MONGODB_URI`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` (the environment's URL), `STORAGE_DRIVER=blob`, `EMAIL_TRANSPORT=smtp` + `SMTP_*` + `EMAIL_FROM` (Preview can keep `console`), `CRON_SECRET` (`openssl rand -hex 24`). Never set `E2E_MODE` on Vercel.
5. **Cron:** `vercel.json` schedules `/api/cron/cleanup` daily at 04:00 UTC; Vercel sends `Authorization: Bearer $CRON_SECRET`.
6. **First admin:** run `npm run seed:admin -- <email> <password>` locally with `MONGODB_URI` pointing at the target cluster.
7. **Verify:** `/api/health` returns `{ ok: true, db: "up" }`; the `e2e` workflow runs the `@smoke` suite against every successful deployment.

Launch checklist: [ROADMAP Phase 1D](docs/product/ROADMAP.md).

## Documentation

Start at **[docs/README.md](docs/README.md)**, the map of all docs and how they relate.

| Doc | What |
| --- | --- |
| [PRD](docs/product/PRD.md) | Requirements and acceptance criteria |
| [Roadmap](docs/product/ROADMAP.md) | Phases, milestones and delivery status |
| [Architecture](docs/engineering/ARCHITECTURE.md) | Technical design, env vars, deployment |
| [Data model](docs/engineering/DATA_MODEL.md) · [API](docs/engineering/API.md) | Collections, Server Actions, routes, DTOs |
| [Design](docs/design/DESIGN.md) | Design system v0.1 |
| [Git workflow](docs/engineering/GIT_WORKFLOW.md) | Branching, commits, PRs, CI/CD |

## AI agents

This repo is set up for AI-assisted development. [AGENTS.md](AGENTS.md) holds the shared agent rules. [docs/ai/](docs/ai/STATE.md) holds the session state and log, so every new session continues where the last one stopped. [CLAUDE.md](CLAUDE.md) and [.claude/](.claude/) hold the Claude Code configuration (skills, subagents, hooks, permissions).

## Contributing

Branch from `staging`, use Conventional Commits that reference PRD IDs, and open PRs into `staging`. See [GIT_WORKFLOW.md](docs/engineering/GIT_WORKFLOW.md).
