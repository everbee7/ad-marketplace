# Current State

> **Snapshot**, overwritten at every handoff (`/handoff`). It is injected automatically at the start of every Claude Code session. History lives in [SESSION_LOG.md](SESSION_LOG.md).

Last updated: 2026-10-02 · after S3

## Where we are
- **Milestone:** M0 Foundations. Docs, agent workflow, session continuity and the lean service stack are done. **The app is not scaffolded yet** (no `package.json`).
- **Repo:** github.com/everbee7/ad-marketplace (public). Default branch `staging`. `main` and `staging` are protected: PR required, no force-push. Required CI checks are not set yet because the workflows don't exist.
- **Open work:** branch `docs/design-system` (DESIGN.md v0.1), PR #2 into `staging`.

## Next up (in order)
1. Merge PR #2 (design system v0.1). The S2 PR is already merged (#1).
2. **Design system:** v0.1 done in `docs/design/DESIGN.md` (from the Bubble prototype, branch `docs/design-system`). Open the PR; get client sign-off on DESIGN.md §10 (provisional colours, fonts, logo SVGs, AU/Balance blocks not in PRD).
3. **M0 scaffold** (see ROADMAP M0): Next.js 16 + TS strict + Tailwind v4 + shadcn, ESLint/Prettier/Husky, `src/env.ts`, `lib/db.ts`, `lib/logger.ts`, `lib/storage.ts` (local driver), `lib/email.ts` (console), `scripts/db-local.ts`, Vitest, Playwright, CI workflows (`ci.yml`, `security.yml`). Then add `ci` and `security` as required checks on `main`/`staging`.
4. Vercel project + Blob store, and MongoDB Atlas (staging/prod). Only needed before the first deploy.

## Active assumptions (provisional until the client answers)
- All "our suggestion" answers in `docs/product/CLIENT_QUESTIONS.md` and the PRD §15 defaults are **in effect** (PRD A7).
- The top 5 questions were sent to the client (D1, C1, B1, E1, F1). Answers go into the ROADMAP decision log.
- Service stack: **Vercel + MongoDB Atlas only** (ADR-0005). No Mux, Resend, Upstash or Sentry. Local dev needs **zero accounts**.

## Blockers / waiting on
- Client answers (not blocking: defaults apply).
- Atlas URI and Blob token: only needed for deploys. Local dev uses a local MongoDB and local file storage.

## Gotchas
- The dev machine is Windows (Git Bash + PowerShell). Write tooling and hooks in Node, not bash.
- Long bash heredocs have failed to parse here. Use the Write/Edit tools for file content.
- Agents are denied reading `.env*` files (`.claude/settings.json`). Ask the user for values. `.env.local` exists locally with dev defaults.
- Direct pushes to `main`/`staging` are blocked by both GitHub and agent permissions. Always use branch → PR.
- The Stop hook blocks finishing while there are uncommitted changes and `docs/ai/` hasn't been updated. Update the log, don't fight it.
