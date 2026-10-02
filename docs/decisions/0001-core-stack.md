# ADR-0001: Core stack: Next.js on Vercel with MongoDB Atlas

- **Status:** Accepted
- **Date:** 2026-10-02
- **Related:** PRD §2, ARCHITECTURE §1

## Context
A three-week MVP for one developer working with AI agents. It needs auth, CRUD dashboards, a marketplace and a rich client editor. The client asked for Next.js, MongoDB and Vercel.

## Decision
- **Next.js 16, App Router, TypeScript strict**, as one full-stack app (no separate API service).
- **Vercel** for hosting, previews, cron and Blob.
- **MongoDB Atlas** through **Mongoose** (schemas, validation, middleware), with a cached connection that works with Vercel Fluid compute.
- **npm** as the package manager (already installed, no extra tooling).

## Alternatives considered
| Option | Why not |
| --- | --- |
| Separate API (NestJS/Express) | More moving parts, with no benefit at MVP scale |
| Postgres + Prisma/Drizzle | The client specified MongoDB. The data is document-shaped (profiles, bursts) |
| Native MongoDB driver only | Mongoose gives schema enforcement and defaults that agents use consistently |

## Consequences
- Long-running work (video rendering) cannot run on Vercel functions and will need an external worker in Phase 2.
- Request bodies are limited to about 4.5 MB, so all media uploads go directly from the browser to the provider.
