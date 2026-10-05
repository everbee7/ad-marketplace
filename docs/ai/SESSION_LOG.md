# Session Log

> **Append-only history** of work sessions, newest first. The two latest entries are injected automatically at session start.
> Add an entry with `/handoff` (Claude Code) or by hand. Current snapshot: [STATE.md](STATE.md). Rationale for big choices lives in ADRs, not here. Link them.
>
> Entry format:
> ```
> ## YYYY-MM-DD · S<n> · <title>
> - **Branch / PR:** …
> - **Goal:** …
> - **Done:** … (PRD IDs, files)
> - **Decisions:** … (→ ADR / PRD version)
> - **Verification:** … (commands actually run + result)
> - **Open / next:** …
> ```

## 2026-10-04 · S6 · Merge the PR chain, stop local servers
- **Branch / PR:** merged #2, #4, #5, #6, #7, #8, #9, #10, #11 into `staging` (squash, branches deleted)
- **Goal:** user asked to merge everything and stop the running app.
- **Done:** stopped the local MongoDB (`db:local`, port 27017); no dev/E2E servers were running. Merged bottom-up; each stacked branch was synced with `staging` (branch side kept for conflicts, files resurrected by squash merges removed), then lint + typecheck + Vitest locally, then waited for `ci` + `security` before merging.
- **Fixes:** `security.yml` failed on #4 (first PR into `staging` since the scaffold): the `shadcn` CLI tree (fast-glob → braces, ts-morph) is flagged by `npm audit --omit=dev` → moved `shadcn` to devDependencies. A stale `vitest.config.ts` came back on M1 via the merge → removed.
- **Verification:** local checks per branch (49 → 98 tests), `ci` + `security` green on every PR before merge.
- **Open / next:** required checks in repo settings; client inputs; Staging deploy (README); real-device Safari/iOS check.

## 2026-10-02 · S5 (cont.) · M8 Hardening
- **Branch / PR:** `chore/m8-hardening` (stacked on `feat/m7-admin`) → PR into `feat/m7-admin`
- **Goal:** ROADMAP M8 items that don't need client accounts.
- **Done:** daily cleanup (`features/maintenance/cleanup.ts`, service hooks `expireStaleAdUploads` / `purgeAdMedia` / `expireStaleVideoUploads`, `/api/cron/cleanup` with timing-safe Bearer check, `vercel.json` cron, `ads.mediaPurgedAt`); `reportClientError` (rate-limited per IP) + `app/error.tsx`, `global-error.tsx`, `not-found.tsx`, an `/admin` loading skeleton (no `loading.tsx` above routes that call `notFound()`: it turns 404s into soft 404s, found by the MKT-03 E2E); skip-to-content link; `@smoke` E2E + `.github/workflows/e2e.yml` (runs on Vercel `deployment_status`); README rewritten (setup, demo logins, deployment runbook).
- **Verification:** cleanup integration 3/3 (stale uploads, 7-day purge once, cron auth), smoke E2E 1/1, full `npm run check`.
- **Open / next:** client inputs (Vercel/Atlas/SMTP/domain/legal copy), Staging deploy + E2E there, real-device Safari/iOS check, cross-browser QA, automated a11y audit + LCP/p95 on Staging. Then Checkpoint C.

## 2026-10-02 · S5 (cont.) · M7 Admin
- **Branch / PR:** `feat/m7-admin` (stacked on `feat/m5-projects-editor`) → PR into `feat/m5-projects-editor`
- **Goal:** ADM-01, ADM-03, ADM-04.
- **Done:** admin queries in `features/admin/queries.ts` (overview counts, ads table incl. deleted, videos table, users with profile name + content counts), read-only Better Auth user helpers in `lib/auth.ts`, `lib/text.ts` (`escapeRegex`), actions `removeAd` / `hideVideo` / `unhideVideo` (logged; hide/unhide now writes `moderationLogs` too), pages `/admin` (overview), `/admin/ads`, `/admin/videos`, `/admin/users` with GET search/filter + pagination, admin media dialog.
- **Fix found:** a server page called `formatDuration` exported from a `"use client"` module (render crash in production) → moved to `features/videos/format.ts`.
- **Verification:** admin integration 5/5 (overview deltas, search/filter/deleted, remove only live + AC1 + log, hide/unhide + AC1 + log, users counts), Playwright admin.spec 1/1.
- **Open / next:** M8 hardening + launch prep.

## 2026-10-02 · S5 (cont.) · M5 Projects & editor + M6 Preview (Phase 1C)
- **Branch / PR:** `feat/m5-projects-editor` (stacked on `feat/m4-creator-videos`), one PR for Phase 1C with separate M5 / M6 commits
- **Goal:** PRJ-01..07, PRV-01..04, and the preview spike (G3).
- **Done:** M5: `features/projects` (pure `bursts.ts` rules, service with invariants + optimistic `revision` + transactional `ads.projectCount`, queries with read-time unavailability, actions), editor UI (`project-editor.tsx`, timeline with drag/snap/clamp/keyboard nudge, hover frame thumbnails, burst list with m:ss.s editing, swap/remove, ad picker with Saved/Marketplace tabs, 1 s auto-save + Save + leave guard, unavailable banner + one-click removal, phone layout without timeline), pages `/creator/projects`, `/new` (client-side auto-create; GET renders never mutate), `/[projectId]`. M6: `features/preview` (pure `timeline.ts`, `engine.ts` with rVFC + rAF fallback, one pre-decoded `<video>` per ad, blob preloading, `?debugPreview=1` timing log; `preview-player.tsx` with unified progress bar, burst segments, Ad label, keyboard Space/←/→/M/F, mute/volume/fullscreen, skipped-burst notice).
- **Decisions / findings:** spike folded into the production engine; ADR-0004 updated with numbers (Chromium rVFC: offset 0–34 ms, gap 8–41 ms; rAF fallback: offset ~12 ms, gap 47–84 ms). Playwright WebKit on Windows can't decode H.264 → WebKit project only on macOS / `E2E_WEBKIT=1`; real Safari + iOS check still open. Bugs fixed while testing: iOS unlock pausing an active burst; timeline reset on every playhead render (now content-keyed); timing log only for playback-triggered cuts.
- **Verification:** unit (timeline 10, bursts 7), integration (projects 7), Playwright: PRD §13 path 3 (incl. G3 assertions) and path 4, rAF fallback + keyboard/seek; editor screenshots reviewed (desktop + phone).
- **Open / next:** Phase 1D: M7 Admin (ADM-01/03/04), M8 hardening + launch. Manual Safari/iOS G3 check before Checkpoint B.

## 2026-10-02 · S5 (cont.) · M4 Creator videos (Phase 1B complete)
- **Branch / PR:** `feat/m4-creator-videos` (stacked on `feat/m3-marketplace`) → PR into `feat/m3-marketplace`
- **Goal:** VID-01, VID-02.
- **Done:** `models/creator-video.ts`, `models/project.ts` (schema from DATA_MODEL, used by M5); `features/videos` (schemas, service: new/retry/finalize/cancel/rename/delete with project cascade + ad `projectCount` sync in one transaction, admin hide flag; queries with per-video project counts and private playback URL; actions; upload form + retry dialog; video list with rename/delete/create-project); pages `/creator/videos`, `/creator/videos/new`; creator home "studio" dashboard. Upload keys `video:<id>:video|poster`. Local dev uploads now stream to disk (`localWriteStream`) so 2 GB files don't sit in memory.
- **Decisions:** creator videos aren't re-read server-side (up to 2 GB): `head()` checks size + content type, and client-reported duration/codec (stored in `pendingUpload.meta` at reservation) are range-checked (ARCHITECTURE §7.1).
- **Verification:** `npm run check` (66 tests incl. 7 video integration: MP4/WebM ready, pre-check messages, retry, privacy incl. hidden, list/rename, delete cascade), Playwright creator-videos 3/3.
- **Open / next:** Phase 1C: M5 Projects & editor, M6 Preview (+ the preview spike).

## 2026-10-02 · S5 (cont.) · M3 Marketplace
- **Branch / PR:** `feat/m3-marketplace` (stacked on `feat/m2-business-ads`) → PR into `feat/m2-business-ads`
- **Goal:** MKT-01..05.
- **Done:** `models/saved-ad.ts`; `features/marketplace` (URL-serialisable query schema, keyset-cursor search with category/duration/aspect filters and `$text`, detail visibility, saved list with unavailable flag, transactional save/unsave keeping `saveCount` in sync, actions); `/api/marketplace`; components (ad card with hover/in-view preview honouring reduced motion, filters, infinite grid with Load more fallback, save button, saved store for cross-page consistency, saved list); pages `/marketplace`, `/marketplace/[adId]`, `/creator/saved`; TanStack Query provider. `scripts/seed-demo.ts` (demo business + 4 approved ads through the services; E2E global setup uses it); fixture posters via ffmpeg; whole `tests/fixtures/media/` ignored.
- **Fixes found on the way:** CI failure on #5: `.gitignore` `uploads/` also hid `src/features/uploads` and `src/app/api/uploads` → anchored to `/uploads/`, files added to M1 and M2 (merge, no force-push). Dropped global `sanitizeFilter` (blocks `$text`). Duplicate sibling React keys on the Marketplace page; uncontrolled→controlled Select warning.
- **Verification:** `npm run check` (59 tests incl. 10 marketplace integration: visibility, 24/page keyset with concurrent insert, filters, text search, sort, detail 404, save idempotency/counters, saved list), Playwright marketplace suite 3/3 + earlier suites; console-error check on key pages clean; screenshots reviewed.
- **Open / next:** M4 Creator videos (VID-01..02).

## 2026-10-02 · S5 (cont.) · M2 Business ads + ADM-02 (Phase 1A complete)
- **Branch / PR:** `feat/m2-business-ads` (stacked on `feat/m1-accounts`) → PR into `feat/m1-accounts`
- **Goal:** AD-01..07 and ADM-02 (review queue), so PRD §13 paths 1, 2, 5 run end to end.
- **Done:** `lib/media.ts` (mp4box probe shared by browser and server, PRD messages); `models/ad.ts`, `models/moderation-log.ts`; `features/ads` (pure `lifecycle.ts` transition table, `service.ts` as the only status writer, queries, actions, components: new-ad form, edit form, replace video, status chip with tooltip, ad card, actions bar); upload flow hook `use-media-upload.ts` + `client.ts` (browser pre-checks, decode test, canvas poster), progress panel, drop zone; `features/admin` review queue (queries, actions, panel); pages `/business` (dashboard + status filter), `/business/ads/new`, `/business/ads/[adId]`, `/business/ads/[adId]/edit`, `/admin/review`. Profile edits sync `businessName`/`businessLogoUrl` onto ads. Submit buttons stay disabled until hydration (`useActionForm().ready`).
- **Decisions:** ADR-0006: `inMarketplace` visibility flag; a replacement video on a live ad keeps the old one visible until approval; reject hides; an invalid replacement leaves the live ad untouched. Replacing while unlisted is reviewed on relist. Reject reason stored as `"<preset>: <note>"`. Global `sanitizeFilter` means operator filters need `mongoose.trusted()`.
- **Verification:** `npm run check` (49 tests: 17 ads integration, lifecycle, media, auth, profiles), `format:check`; Playwright 9/9 (accounts + business ads: paths 1, 2, 5, 6, HEVC/duration rejection, unlist/relist/delete). Checkpoint A screenshots reviewed (dashboard, ad detail, review queue).
- **Open / next:** Phase 1B: M3 Marketplace, M4 Creator videos.

## 2026-10-02 · S5 (cont.) · M1 Accounts
- **Branch / PR:** `feat/m1-accounts` (stacked on `chore/m0-scaffold`) → PR into `chore/m0-scaffold` (GitHub retargets to `staging` when #4 merges)
- **Goal:** AUTH-01..05, PRF-01..02.
- **Done:** `lib/auth.ts` (Better Auth + MongoDB adapter on the shared client; hooks for role/password/duplicate email/lockout/role immutability), `lib/permissions.ts` (`requireUser`, `requirePageUser`, `assertOwner`), `proxy.ts`, `lib/action.ts` (Zod + error mapping), auth pages (signup, login, verify-email + done, forgot/reset), onboarding + profile pages, `models/profile.ts`, profiles service/queries/actions, image uploads (`startImageUpload`, `/api/uploads/token`, `/api/dev-files` with Range), app shell (header, role nav, account menu), role layouts, terms/privacy placeholders, `scripts/seed-admin.ts`.
- **Decisions:** no browser auth client (Server Actions over Better Auth server API). Single-use verification = a reused link no longer signs in. Creator `niche` uses the category list. Extra `authEmail` rate bucket (5/h/email) for resend/reset emails.
- **Verification:** `npm run check` (23 tests incl. 9 auth + 5 profile integration), `format:check`; Playwright accounts suite 5/5 green (sign-up → verify → onboarding, role guard path 6, next param, duplicate/unverified, profile edit).
- **Open / next:** M2 Business ads + ADM-02. Add `/admin/review` back into the path-6 E2E.

## 2026-10-02 · S5 · M0 scaffold
- **Branch / PR:** `chore/m0-scaffold` (from `docs/design-system`) → PR into `staging`
- **Goal:** Phase 0 foundations: runnable app, core libs, tests, CI.
- **Done:** Next.js 16.3 app (create-next-app). shadcn radix-nova restyled to DESIGN tokens (`globals.css`, button/input/select/textarea). `env.ts`; `lib/db.ts` (one MongoClient shared by Better Auth and Mongoose); logger; errors/ActionResult; ratelimit (Mongo fixed window); storage (local + blob server side, browser upload client); email (console outbox + SMTP, React Email template); instrumentation; landing page; `/api/health`. Vitest (in-memory replica set, DB per file), Playwright config + isolated e2e server, ffmpeg fixtures, `ci.yml` + `security.yml`.
- **Decisions:** media fixtures are generated, never committed. mongod 7.0.24 for tests. Local storage URLs are relative `/api/dev-files/...` and only our origin is accepted.
- **Verification:** `npm run lint`, `typecheck`, `format:check`, `test` (9 passing) and `build` all green. Dev server against the user's Atlas: `/api/health` → db up. Landing screenshots at 1440 and 390 px checked against the prototype.
- **Open / next:** merge #2 + the M0 PR; Phase 1A (M1 Accounts).

## 2026-10-02 · S4 · Delivery phases
- **Branch / PR:** `docs/delivery-phases` → PR #3, merged
- **Goal:** turn the flat M0–M8 milestone list into a phased plan for the whole project.
- **Done:** restructured `docs/product/ROADMAP.md` into Phase 0 (Foundations & de-risking), 1A (Business side → Checkpoint A), 1B (Marketplace & creator library), 1C (Editor & preview → Checkpoint B), 1D (Admin, hardening & launch → Checkpoint C) and Phase 2 (post-MVP tracks 2.0–2.7 from PRD §17). Each phase has entry/exit gates and the client inputs it needs.
- **Decisions:** preview spike moved to Phase 0 (G3 risk, PRD §16). ADM-02 moved into Phase 1A, so ads can go live at Checkpoint A. Staging deploy moved into Phase 0. MVP estimate 17 → 20 d (spike + 2 feedback days). "Phase 2" keeps its PRD meaning (post-MVP).
- **Verification:** estimates cross-checked (sum 20 d). All PRD IDs from the old list are still present. Docs only, no code.
- **Open / next:** user review → `/open-pr`. Then DESIGN.md + M0 scaffold in parallel.

## 2026-10-02 · S3 · Design system v0.1 from the Bubble prototype
- **Branch / PR:** `docs/design-system` → PR #2 into `staging`
- **Goal:** turn the client's two Bubble screens (landing, business portal) into design instructions.
- **Done:** scraped both pages with headless Chrome (playwright-core in the session scratchpad, not a project dependency): screenshots + computed styles. Wrote `docs/design/DESIGN.md` v0.1 (brand, colour tokens, type scale, spacing/radii/glow, icons, components, screens, editor, a11y, client questions). Screenshots in `docs/design/reference/`. README status and ROADMAP M0 tick updated.
- **Decisions:** dark-only MVP; blue `#4B9CD3` is the only accent (outlined + glow buttons); Helvetica display + Archivo (next/font) pairing; status/success/error colours, editor visuals and motion marked provisional. Prototype's AU / Balance blocks are not in the PRD, so not built until a PRD change.
- **Verification:** token values taken from computed styles; contrast of text tokens on black checked by calculation (≥ 5.3:1).
- **Open / next:** client sign-off on DESIGN.md §10. Then the M0 scaffold (map tokens into `src/app/globals.css` `@theme`).

## 2026-10-02 · S2 · Session continuity, lean service stack, provisional defaults
- **Branch / PR:** `chore/session-continuity-lean-stack` → PR into `staging`
- **Goal:** let new sessions continue without explanation. Cut external services for the MVP. Make a local env file. Proceed on default answers while the client is undecided.
- **Done:**
  - Session continuity: `docs/ai/STATE.md` + this log. `.claude/hooks/session-context.mjs` (SessionStart: injects state, last 2 log entries, git status). `.claude/hooks/require-session-log.mjs` (Stop: requires a docs/ai update when there are uncommitted changes). `/handoff` skill. AGENTS.md "Session continuity" section.
  - Lean stack: ADR-0005 (Vercel + MongoDB only). Supersedes ADR-0003 (Mux), amends 0002 and 0004. Rewrote ARCHITECTURE.md and API.md. Updated DATA_MODEL.md (no `processing` status, new `VideoAsset` shape, `rateLimits` collection), PRD (AD-01, VID-01, §9, §10, §12, A5, A7, risks → v1.0-draft.2), `.env.example`, README, CONVENTIONS, CLIENT_QUESTIONS L1.
  - Created `.env.local` (gitignored) with generated `BETTER_AUTH_SECRET`/`CRON_SECRET` and zero-account local defaults (`STORAGE_DRIVER=local`, `EMAIL_TRANSPORT=console`, local Mongo URI).
- **Decisions:** ADR-0005. PRD A7: client-questionnaire defaults are in effect until answered.
- **Verification:** hook scripts run with sample input (exit 0, expected output). `settings.json` parses. No app code exists yet.
- **Open / next:** merge the PR. Then the design system (DESIGN.md), then the M0 scaffold.

## 2026-10-02 · S1 · Bootstrap docs and agent workflow
- **Branch / PR:** direct to `main` (bootstrap exception, commit `6b13db3`). `staging` created from it.
- **Goal:** turn the job description and draft PRD into a best-practice doc set plus Claude Code configuration.
- **Done:** PRD v1.0-draft (burst-ad model: 0.5–2 s clips, ≤ 10 inserted bursts per video), ROADMAP M0–M8, ARCHITECTURE / DATA_MODEL / API / CONVENTIONS, GIT_WORKFLOW adapted to Vercel/Mongo, ADR-0001..0004, DESIGN.md placeholder, CLIENT_QUESTIONS.md (plain-language, ~50 questions), AGENTS.md + CLAUDE.md, `.claude/` (settings, format hook, `/implement`, `/adr`, `/open-pr`, `acceptance-verifier`), PR template. GitHub: branch protection on `main`/`staging`, default branch `staging`, squash + merge-commit only.
- **Decisions:** Better Auth over Auth.js (ADR-0002). Client-side burst preview with rVFC timing (ADR-0004). The original draft is archived at `docs/product/archive/MVP_PRD_v0.md`.
- **Verification:** format hook tested (no-op before Prettier is installed). Doc links checked.
- **Open / next:** client answers. Design system. Scaffold.
