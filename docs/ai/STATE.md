# Current State

> **Snapshot**, overwritten at every handoff (`/handoff`). It is injected automatically at the start of every Claude Code session. History lives in [SESSION_LOG.md](SESSION_LOG.md).

Last updated: 2026-10-02 · after S3

## Where we are
- **Phase:** Phase 0 (Foundations & de-risking), milestone M0. The delivery plan is now organised in phases in [ROADMAP.md](../product/ROADMAP.md): 0 → 1A → 1B → 1C → 1D (launch) → 2 (post-MVP). MVP ≈ 20 working days.
- Docs, agent workflow, session continuity and the lean service stack are done. **The app is not scaffolded yet** (no `package.json`).
- **Repo:** github.com/everbee7/ad-marketplace (public). Default branch `staging`. `main` and `staging` are protected: PR required, no force-push. Required CI checks are not set yet because the workflows don't exist.
- **Open work:** branch `docs/delivery-phases` (ROADMAP phases). Not committed yet. Commit + PR into `staging` when the user approves (`/open-pr`).

## Next up (in order, all Phase 0)
1. Get the phase plan approved and merged.
2. Design system v0.1 is done (PR #2). Map its tokens into `src/app/globals.css` during the scaffold.
3. **M0 scaffold:** Next.js 16 + TS strict + Tailwind v4 + shadcn, ESLint/Prettier/Husky, `src/env.ts`, `lib/*`, `scripts/db-local.ts`, Vitest, Playwright, CI workflows. Then add `ci` and `security` as required checks.
4. **Preview spike** (≈ 1 d, throwaway): measure G3 timing on Chrome, desktop Safari and iOS Safari. Record the result in ADR-0004.
5. **Staging deploy:** Vercel project + Blob store + Atlas staging cluster (client-owned accounts). Now needed by the end of Phase 0, because Checkpoint A is a Staging demo.

## Active assumptions (provisional until the client answers)
- All "our suggestion" answers in `docs/product/CLIENT_QUESTIONS.md` and the PRD §15 defaults are **in effect** (PRD A7).
- The top 5 questions were sent to the client (D1, C1, B1, E1, F1). Answers go into the ROADMAP decision log.
- Service stack: **Vercel + MongoDB Atlas only** (ADR-0005). No Mux, Resend, Upstash or Sentry. Local dev needs **zero accounts**.
- Plan reorders (S3): ADM-02 review queue moved into Phase 1A. Preview spike and Staging deploy moved into Phase 0.

## Blockers / waiting on
- Client answers (not blocking: defaults apply).
- Client-owned Vercel team and Atlas org: needed by the end of Phase 0. SMTP credentials: needed in Phase 1A (Staging) and 1D (Production).

## Gotchas
- The dev machine is Windows (Git Bash + PowerShell). Write tooling and hooks in Node, not bash.
- Long bash heredocs have failed to parse here. Use the Write/Edit tools for file content.
- Agents are denied reading `.env*` files (`.claude/settings.json`). Ask the user for values. `.env.local` exists locally with dev defaults.
- Direct pushes to `main`/`staging` are blocked by both GitHub and agent permissions. Always use branch → PR.
- The Stop hook blocks finishing while there are uncommitted changes and `docs/ai/` hasn't been updated. Update the log, don't fight it.
- "Phase 2" in all docs means **post-MVP**. MVP work lives in Phases 0 and 1A–1D.
