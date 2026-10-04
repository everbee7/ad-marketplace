# Current State

> **Snapshot**, overwritten at every handoff (`/handoff`). It is injected automatically at the start of every Claude Code session. History lives in [SESSION_LOG.md](SESSION_LOG.md).

Last updated: 2026-10-02 · S5 (Phase 1C: editor + preview)

## Where we are
- **Phase 0 · M0:** the app is scaffolded. Next.js 16.3, React 19.2, Tailwind v4 + shadcn (radix-nova, restyled to DESIGN.md v0.1), Zod 4, Mongoose 9, Better Auth 1.7 (installed, wired in M1). Core libs: `src/env.ts`, `lib/{db,logger,errors,ratelimit,storage,storage-client,email}`, `instrumentation.ts`. Landing page, `/api/health`. Vitest + mongodb-memory-server, Playwright config + `scripts/e2e-server.mjs`, generated media fixtures, CI (`ci.yml`, `security.yml`).
- **Phases 1A–1C built:** M1 Accounts (#5), M2 Business ads + ADM-02 (#6), M3 Marketplace (#7), M4 Creator videos (#8), M5 Projects & editor + M6 Preview (branch `feat/m5-projects-editor`). Stacked PR chain: #4 (M0) ← #5 ← #6 ← #7 ← #8 ← 1C. Merge from the bottom; GitHub retargets each PR to `staging` as its base merges.
- **Preview G3:** met on Chromium (rVFC and rAF fallback), numbers in ADR-0004. **Not yet measured on real Safari / iPhone**: open the editor with `?debugPreview=1`, play, read `window.__flashdPreviewLog`.
- **Open PRs:** #2 design system (conflicts resolved; the user merges it, self-merge was blocked). `chore/m0-scaffold` is cut from `docs/design-system`, so its PR contains #2's commits.
- **Repo:** github.com/everbee7/ad-marketplace. Default branch `staging`, protected (PR required, no force-push).

## Next up (in order)
1. Merge PR #2 and the M0 PR. Then mark `ci` + `security` as required checks.
2. Phase 1D: M7 Admin (ADM-01, ADM-03, ADM-04), then M8 hardening (cron cleanup, error reporting, error/loading states, a11y + perf pass, handover). Keep stacking branches until the user merges.
3. Manual Safari + iOS check of the preview (G3, PRV-04) on a real device.
4. Vercel + Atlas staging (client-owned accounts).

## Active assumptions (provisional until the client answers)
- All "our suggestion" answers in `docs/product/CLIENT_QUESTIONS.md` and the PRD §15 defaults are **in effect** (PRD A7).
- The top 5 questions were sent to the client (D1, C1, B1, E1, F1). Answers go into the ROADMAP decision log.
- Service stack: **Vercel + MongoDB Atlas only** (ADR-0005). Local dev needs **zero accounts**.
- Plan reorders (S4): ADM-02 in Phase 1A; preview spike and Staging deploy in Phase 0.
- Landing omits the prototype's Attention Units and "Meet our team" blocks (not in the PRD, DESIGN §10).

## Blockers / waiting on
- Client answers (not blocking: defaults apply).
- Client-owned Vercel team and Atlas org (Staging). SMTP credentials: Phase 1A (Staging) and 1D (Production).

## Gotchas
- Playwright Chromium here plays H.264/AAC and has rVFC; Playwright WebKit on Windows reports H.264 as playable but fails to decode it (MEDIA_ERR_SRC_NOT_SUPPORTED).
- Editor E2E: a new burst lands at the nearest free slot to the playhead and the list re-sorts, so tests must address the row where it lands; wait for the picker dialog to close before typing (focus returns to Add burst).
- No global Mongoose `sanitizeFilter` (it blocks `$text`): build filters only from Zod-parsed scalars (ARCHITECTURE §9).
- Transactions: a duplicate-key error aborts the whole transaction; check existence first and catch E11000 outside `connection.transaction()`.
- E2E runs `next dev` (local storage driver is refused in production). First hits compile routes (5–8 s), so helpers wait for hydration (`toBeEnabled`) and for the post-login redirect; Playwright retries once.
- `SCREENSHOTS=1 npx playwright test screens` captures checkpoint screens into `test-results/screens`.
- The dev machine is Windows (Git Bash + PowerShell). Write tooling and hooks in Node, not bash. Use the Write/Edit tools for file content (heredocs and quoting break).
- `.env.local` points `MONGODB_URI` at an Atlas cluster (`mongodb+srv`). This machine's local DNS refuses SRV queries, so `lib/db.ts` appends public resolvers outside production (both `dns` and `dns.promises`). `npm run db:local` gives a local replica set on :27017 instead.
- mongodb-memory-server is pinned to MongoDB 7.0.24: the 8.x Windows binary crashes with an illegal instruction (no AVX2 on this CPU).
- Stopping a background `npx next dev` leaves the node child running. Start it with `node node_modules/next/dist/bin/next dev` and kill by port (`netstat -ano`).
- Agents are denied reading `.env*` files, and the classifier also blocked reading `.env.example`. Env var names are documented in ARCHITECTURE §11.1; keep `.env.example` in sync by hand.
- Direct pushes to `main`/`staging` are blocked. Always use branch → PR. Self-merging PRs was blocked by the auto-mode classifier: the user merges.
- The Stop hook blocks finishing while there are uncommitted changes and `docs/ai/` hasn't been updated.
- "Phase 2" in all docs means **post-MVP**. MVP work lives in Phases 0 and 1A–1D.
- `next dev` appends a "nextjs-agent-rules" block to AGENTS.md. Commit it; Next's own docs are in `node_modules/next/dist/docs/`.
