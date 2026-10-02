# Roadmap & Delivery Status

> The **living status board**. Every PR that delivers a requirement ticks it here.
> Requirement definitions: [PRD.md](PRD.md). Estimates are in working days, assuming one full-time developer working with AI agents.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done (merged to `staging`, AC verified) · `[-]` dropped (see PRD change log)

## Current focus

**M0. Foundations** · next up: design system definition ([DESIGN.md](../design/DESIGN.md))

## Milestones

### M0. Foundations (≈ 1.5 d)
- [x] Docs structure, PRD v1.0-draft, agent configuration (AGENTS.md, CLAUDE.md, `.claude/`)
- [ ] Design system defined in DESIGN.md (tokens, typography, components)
- [ ] Next.js 16 scaffold, TypeScript strict, Tailwind v4, shadcn/ui, ESLint/Prettier/Husky
- [ ] `src/env.ts`, `lib/db.ts`, `lib/logger.ts`, Sentry
- [ ] GitHub repo, `staging` branch, branch protection, CI workflows, PR template
- [ ] Vercel project (Preview/Staging/Production), Atlas clusters, Mux / Resend / Upstash accounts

### M1. Accounts (≈ 2 d)
- [ ] AUTH-01 Sign up with role
- [ ] AUTH-02 Email verification
- [ ] AUTH-03 Log in / log out
- [ ] AUTH-04 Forgot / reset password
- [ ] AUTH-05 Route protection
- [ ] PRF-01 Onboarding
- [ ] PRF-02 Edit profile

### M2. Business ads (≈ 2.5 d)
- [ ] AD-01 Upload burst ad (upload pipeline + Mux webhooks)
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
Record answers to [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md) here, then fold them into the PRD. Questionnaire status: **not yet sent**.

| Client Q | PRD OQ | Answer | Date | Folded into PRD version |
| --- | --- | --- | --- | --- |
| | | | | |
