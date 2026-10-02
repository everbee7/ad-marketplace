# Roadmap & Delivery Status

> The **living status board**. Every PR that delivers a requirement ticks it here.
> Requirement definitions: [PRD.md](PRD.md). Estimates are in working days, assuming one full-time developer working with AI agents.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done (merged to `staging`, AC verified) · `[-]` dropped (see PRD change log)

## Current focus

**M0. Foundations** · next up: Next.js scaffold (design system v0.1 in [DESIGN.md](../design/DESIGN.md)). Live status and next steps: [docs/ai/STATE.md](../ai/STATE.md)

## Milestones

### M0. Foundations (≈ 1.5 d)
- [x] Docs structure, PRD v1.0-draft, agent configuration (AGENTS.md, CLAUDE.md, `.claude/`)
- [x] Session continuity (docs/ai, SessionStart/Stop hooks, `/handoff`)
- [x] Lean service stack decided (ADR-0005)
- [x] GitHub repo, `staging` branch, branch protection, PR template
- [x] Design system defined in DESIGN.md (tokens, typography, components). v0.1 from the Bubble prototype; open questions in DESIGN.md §10
- [ ] Next.js 16 scaffold, TypeScript strict, Tailwind v4, shadcn/ui, ESLint/Prettier/Husky
- [ ] `src/env.ts`, `lib/db.ts`, `lib/logger.ts`, `instrumentation.ts`, `lib/storage.ts` (local + blob), `lib/email.ts` (console + smtp), `lib/ratelimit.ts`, `scripts/db-local.ts`
- [ ] CI workflows (`ci.yml`, `security.yml`) → mark them as required checks
- [ ] Vercel project (Preview/Staging/Production, Pro plan for prod) + Blob stores, Atlas staging/prod clusters

### M1. Accounts (≈ 2 d)
- [ ] AUTH-01 Sign up with role
- [ ] AUTH-02 Email verification
- [ ] AUTH-03 Log in / log out
- [ ] AUTH-04 Forgot / reset password
- [ ] AUTH-05 Route protection
- [ ] PRF-01 Onboarding
- [ ] PRF-02 Edit profile

### M2. Business ads (≈ 2.5 d)
- [ ] AD-01 Upload burst ad (storage adapter, upload token, finalize + server-side duration check)
- [ ] AD-02 Processing failure & retry
- [ ] AD-03 My ads dashboard
- [ ] AD-04 Ad detail
- [ ] AD-05 Edit ad
- [ ] AD-06 Unlist / relist
- [ ] AD-07 Delete ad

**Checkpoint A: client demo of the business side**

### M3. Marketplace (≈ 2 d)
- [ ] MKT-01 Browse
- [ ] MKT-02 Search, filter, sort
- [ ] MKT-03 Ad detail page
- [ ] MKT-04 Save / unsave
- [ ] MKT-05 Saved ads page

### M4. Creator videos (≈ 1 d)
- [ ] VID-01 Upload video (signed playback)
- [ ] VID-02 My videos

### M5. Projects & editor (≈ 2.5 d)
- [ ] PRJ-01 Create project
- [ ] PRJ-02 Editor layout
- [ ] PRJ-03 Place and adjust bursts
- [ ] PRJ-04 Save (auto-save)
- [ ] PRJ-05 Projects list
- [ ] PRJ-06 Reopen
- [ ] PRJ-07 Unavailable ads

### M6. Preview (≈ 2 d)
- [ ] PRV-01 Composite playback (G3 timing on Chrome + Safari + iOS)
- [ ] PRV-02 Controls
- [ ] PRV-03 Preview from editor
- [ ] PRV-04 Mobile playback

**Checkpoint B: client demo of the marketplace and creator flow**

### M7. Admin (≈ 1.5 d)
- [ ] ADM-01 Overview
- [ ] ADM-02 Review queue
- [ ] ADM-03 Content moderation
- [ ] ADM-04 Users

### M8. Hardening & launch (≈ 2 d)
- [ ] E2E paths 1–6 (PRD §13) green on Staging
- [ ] Cron cleanup, rate limits, security headers, CSP
- [ ] Cross-browser QA matrix (PRD §12)
- [ ] Seed scripts, production env, handover notes

**Checkpoint C: launch**

Total ≈ 17 working days (~3.5 weeks).

## Decision log (client answers)
Record answers to [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md) here, then fold them into the PRD. Questionnaire status: **top 5 sent 2026-10-02** (D1, C1, B1, E1, F1). Until answered, the suggested answers are in effect (PRD A7).

| Client Q | PRD OQ | Answer | Date | Folded into PRD version |
| --- | --- | --- | --- | --- |
| D1 | OQ-2 | *Provisional:* preview only, no download | 2026-10-02 | 1.0-draft |
| C1 | OQ-9 | *Provisional:* cut-in (video pauses) | 2026-10-02 | 1.0-draft |
| B1 | OQ-3 | *Provisional:* 0.5–2 s | 2026-10-02 | 1.0-draft |
| E1 | OQ-1 | *Provisional:* free use, no approval | 2026-10-02 | 1.0-draft |
| F1 | OQ-11 | *Provisional:* no payments in MVP | 2026-10-02 | 1.0-draft |
