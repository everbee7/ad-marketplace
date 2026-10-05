# Current State

> **Snapshot**, overwritten at every handoff (`/handoff`). It is injected automatically at the start of every Claude Code session. History lives in [SESSION_LOG.md](SESSION_LOG.md).

Last updated: 2026-10-05 · S7 (self-hosted on Windows Server)

## Where we are
- **The MVP (M0–M8) is merged into `staging` and runs in production on the client's Windows Server** (ADR-0007): http://68.168.20.36 (HTTP, port 80). NSSM service `Flashd` runs `C:\flashd\app` (clone of `staging`); settings in `C:\flashd-data\config\flashd.env` (admin-only ACL); media in `C:\flashd-data\uploads`; logs in `C:\flashd-data\logs`; Task Scheduler `Flashd cleanup` daily 04:00. Database: the existing Atlas cluster, database `flashd_prod`. Admin `admin@flashd.local` created (password given to the user once, not stored in the repo).
- Vercel is no longer the target; the Vercel project linked to the repo still builds PRs and fails (harmless; the user may disconnect it).
- All local servers (dev server, local MongoDB) were stopped at the user's request.
- **Preview G3:** met on Chromium (rVFC and rAF fallback; numbers in ADR-0004). **Not yet measured on real Safari / iPhone.**
- **Repo:** github.com/everbee7/ad-marketplace. Default branch `staging`, protected (PR required, no force-push). Required checks not set yet.

## Next up (in order)
1. Set `ci` + `security` as required checks on `staging`/`main` (repo settings).
2. **Client inputs** (ROADMAP Phase 1D): Vercel team (Pro for Production) + Atlas org, SMTP mailbox, domain (OQ-8), terms/privacy text (PRD §11), logo SVGs (DESIGN §10).
3. Before real users: domain + HTTPS (e.g. Caddy in front), SMTP (`EMAIL_TRANSPORT=smtp`), more disk for `STORAGE_LOCAL_DIR` (C: had ~5 GB free), restrict Atlas network access to 68.168.20.36 (user said not needed for now). Redeploy with `node scripts/ops/deploy.mjs staging` in `C:\flashd\app`.
4. **Real-device check:** iPhone (iOS 16+) + desktop Safari, editor with `?debugPreview=1`, read `window.__flashdPreviewLog` (G3, PRV-04). If it misses, MSE splice via a new ADR.
5. Cross-browser QA (PRD §12), automated a11y audit, LCP/p95 on Staging. Then Production and Checkpoint C.
6. Keep `.env.example` in sync with ARCHITECTURE §11.1 (agents couldn't read it this session): new vars `E2E_MODE` (E2E only) and the full list in the table.

## Active assumptions (provisional until the client answers)
- All "our suggestion" answers in `docs/product/CLIENT_QUESTIONS.md` and the PRD §15 defaults are **in effect** (PRD A7): preview only (no export), cut-in bursts, 0.5–2 s ads, free use of live ads, no payments, login required to browse, 10 bursts / 1.0 s spacing.
- Service stack: **Vercel + MongoDB Atlas only** (ADR-0005). Local dev needs **zero accounts**.
- ADR-0006: a replacement video on a live ad keeps the old one visible until approval (`inMarketplace` flag).
- Creator `niche` uses the ad category list. Landing omits the prototype's Attention Units and "Meet our team" blocks (not in the PRD, DESIGN §10).

## Blockers / waiting on
- Client answers (not blocking: defaults apply).
- Client-owned Vercel/Atlas accounts, SMTP, domain, legal copy (blocking only deploys).
- Real iPhone / Safari for the G3 check.

## Gotchas
- Production email is `console`: verification/reset links appear in `C:\flashd-data\logs\flashd.out.log`.
- `NEXT_PUBLIC_APP_URL` is baked in at build time: after changing it (e.g. a domain), rebuild via `deploy.mjs`.
- On Windows, don't call `process.exit()` right after `fetch` in scripts (libuv assertion); set `process.exitCode`.
- `shadcn` is a **devDependency** (its CLI tree failed `npm audit --omit=dev`); only `shadcn/tailwind.css` is used, at build time.
- Branches cut before a squash-merged base must be re-synced: keep the branch side for conflicts and delete files the merge resurrects (e.g. an old `vitest.config.ts`).
- Windows dev machine (Git Bash + PowerShell): write tooling in Node; use the Write/Edit tools for file content (heredocs and quotes break; escaped `\|` in markdown tables got mangled once — check tables after scripted edits).
- `.gitignore` patterns can hide source folders (the old `uploads/` rule hid `src/features/uploads`). Before each PR: `git ls-files --others --ignored --exclude-standard src tests scripts docs`.
- A `"use client"` module can't export helpers used by server components (render crash in production). Shared helpers go in plain modules (e.g. `features/videos/format.ts`).
- E2E runs against a **production build** (`scripts/e2e-server.mjs` → `.next-e2e`, `E2E_MODE=1`); `E2E_DEV=1` uses `next dev`. Global setup seeds `scripts/seed-demo.ts`. Helpers wait for hydration (`toBeEnabled`) and post-login redirects; optimistic UI needs `waitForResponse` before reloads.
- Editor E2E: new bursts land at the nearest free slot to the playhead and the list re-sorts; wait for the picker dialog to close before typing.
- Playwright Chromium here plays H.264/AAC with rVFC; Playwright WebKit on Windows can't decode H.264 (WebKit project only on macOS / `E2E_WEBKIT=1`).
- No global Mongoose `sanitizeFilter` (it blocks `$text`): filters come only from Zod-parsed scalars. A duplicate-key error aborts a whole transaction: check existence first, catch E11000 outside.
- `.env.local` points `MONGODB_URI` at Atlas (`mongodb+srv`); this machine's DNS refuses SRV queries, so `lib/db.ts` appends public resolvers outside production. `npm run db:local` gives a local replica set.
- mongodb-memory-server pinned to MongoDB 7.0.24 (8.x crashes on this CPU: no AVX2).
- Stopping a background `npx next dev` leaves the node child running: start with `node node_modules/next/dist/bin/next dev`, kill by port.
- Agents can't read `.env*` (and were blocked from `.env.example`). Self-merging PRs and editing `.claude/settings.local.json` were blocked by the auto-mode classifier.
- `SCREENSHOTS=1 npx playwright test screens` captures review screens (and checks key pages for console errors) into `test-results/screens`.
- "Phase 2" in all docs means **post-MVP**.
