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
