# Flashd

A marketplace connecting **businesses** and **content creators** through **burst ads**: 0.5–2 second branded clips that creators insert into their own videos.

- Businesses upload burst ads. An admin reviews them, and approved ads go live in a shared Marketplace.
- Creators browse and save ads, upload videos, place bursts on a timeline, preview the combined video in the browser, and save projects.

> **Status:** planning complete, app not yet scaffolded. See [docs/product/ROADMAP.md](docs/product/ROADMAP.md).

## Tech stack

Next.js 16 (App Router, TypeScript) · MongoDB Atlas + Mongoose · Vercel · Better Auth · Mux Video · Vercel Blob · Resend · Upstash · Tailwind CSS v4 + shadcn/ui · Vitest + Playwright

Details and rationale: [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md), [docs/decisions/](docs/decisions/README.md).

## Getting started

> Available after milestone M0 (scaffold).

Prerequisites: Node.js 22+ (LTS), npm, a MongoDB Atlas dev database, Mux / Resend / Upstash dev accounts, and the Vercel CLI.

```bash
npm install
cp .env.example .env.local   # or: vercel env pull .env.local
npm run seed:admin
npm run dev                  # http://localhost:3000
```

Mux webhooks in local development need a tunnel (e.g. `ngrok http 3000`), registered in the Mux dev environment as `<tunnel>/api/webhooks/mux`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run check` | Lint + typecheck + unit/integration tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Documentation

Start at **[docs/README.md](docs/README.md)**, the map of all docs and how they relate.

| Doc | What |
| --- | --- |
| [PRD](docs/product/PRD.md) | Requirements and acceptance criteria |
| [Roadmap](docs/product/ROADMAP.md) | Milestones and delivery status |
| [Architecture](docs/engineering/ARCHITECTURE.md) | Technical design |
| [Design](docs/design/DESIGN.md) | Design system (in progress) |
| [Git workflow](docs/engineering/GIT_WORKFLOW.md) | Branching, commits, PRs, CI/CD |

## AI agents

This repo is set up for AI-assisted development. [AGENTS.md](AGENTS.md) holds the shared agent rules. [CLAUDE.md](CLAUDE.md) and [.claude/](.claude/) hold the Claude Code configuration (skills, subagents, hooks, permissions).

## Contributing

Branch from `staging`, use Conventional Commits that reference PRD IDs, and open PRs into `staging`. See [GIT_WORKFLOW.md](docs/engineering/GIT_WORKFLOW.md).
