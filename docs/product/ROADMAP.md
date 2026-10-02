# Roadmap & Delivery Status

> The **living status board**. Every PR that delivers a requirement ticks it here.
> Requirement definitions: [PRD.md](PRD.md). Estimates are in working days, assuming one full-time developer working with AI agents.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done (merged to `staging`, AC verified) · `[-]` dropped (see PRD change log)

## Current focus

**Phase 1C · M5. Projects & editor** (Phases 1A and 1B built: M0–M4 + ADM-02; preview spike and Staging deploy pending). Live status and next steps: [docs/ai/STATE.md](../ai/STATE.md)

## Phases

The work is split into **phases**. Each phase ends with something that can be shown or shipped. **Milestones** (M0–M8) are the build units inside a phase, and each one holds PRD requirement IDs. "Phase 2" keeps its meaning from the PRD and ADRs: everything after the MVP launch.

| Phase | Goal | Milestones | Est. | Ends with |
| --- | --- | --- | --- | --- |
| **0. Foundations & de-risking** | Tooling, design system, a deployable empty app, and proof that the preview engine can hit G3 | M0 + preview spike | ≈ 2.5 d | Empty app live on the Staging URL. Spike result recorded |
| **1A. Business side** | A business can publish an ad and an admin can approve it (J1, J3) | M1, M2, ADM-02 | ≈ 6 d | **Checkpoint A**: client demo on Staging |
| **1B. Marketplace & creator library** | A creator can find and save ads and upload videos | M3, M4 | ≈ 3 d | Internal review on Staging |
| **1C. Editor & preview** | A creator can place bursts, preview and save a project (J2, J4) | M5, M6 | ≈ 5.5 d | **Checkpoint B**: client demo on Staging |
| **1D. Admin, hardening & launch** | Full moderation, launch criteria G1–G5 met in production | M7 (rest), M8 | ≈ 3 d | **Checkpoint C**: production launch |
| **2. Post-MVP** | Stabilise, measure (PRD §3.2), then build from the backlog (PRD §17) | Tracks below | Re-estimated after launch | Per track |

**MVP total ≈ 20 working days (~4 weeks)**: the earlier 17 d of build work, plus 1 d for the preview spike, plus 1 feedback day after each of Checkpoints A and B (counted in Phases 1A and 1C).

```
Phase 0 ──► 1A ──► 1B ──► 1C ──► 1D ──► launch ──► Phase 2
            │A             │B      │C
         (demo)         (demo)   (launch)
```

### Changes from the earlier milestone order
- **Preview spike moved into Phase 0.** G3 timing on Safari/iOS is the biggest technical risk (PRD §16). We prove it on a throwaway page before building the editor, not on M6 day 1.
- **ADM-02 (review queue) moved into Phase 1A.** Without it, no ad can reach `live`. The Checkpoint A demo would stop at *In review*, and Phase 1B would have no real ads to browse. E2E paths 1, 2 and 5 can then run from Phase 1A.
- **Staging deploy moved into Phase 0.** Checkpoint A is a demo on a real URL, so Vercel + Atlas staging must exist by then. Production setup stays in Phase 1D.

### Rules for every phase
- **Scope freeze:** once a phase starts, new requests go to the Phase 2 backlog or wait for the next phase. A change that touches the current phase needs a PRD version bump and a re-estimate (PRD §16).
- **Exit gate:** a phase is done when its requirements are ticked, `npm run check` and the build pass, the E2E paths listed below for it are green on Staging, and `docs/ai/STATE.md` is updated.
- **Client feedback:** 1 business day after each checkpoint. Silence means the documented defaults stay in effect (PRD A7).

---

## Phase 0. Foundations & de-risking (≈ 2.5 d)

**Entry:** docs and agent workflow in place (done).
**Exit:** an empty app deploys to Staging through CI, DESIGN.md is approved by the user, and the spike result is recorded in ADR-0004.
**Client inputs needed:** a Vercel team and a MongoDB Atlas org owned by the client (or invites to them), by the end of this phase.

### M0. Foundations
- [x] Docs structure, PRD v1.0-draft, agent configuration (AGENTS.md, CLAUDE.md, `.claude/`)
- [x] Session continuity (docs/ai, SessionStart/Stop hooks, `/handoff`)
- [x] Lean service stack decided (ADR-0005)
- [x] GitHub repo, `staging` branch, branch protection, PR template
- [x] Design system v0.1 defined in DESIGN.md (from the Bubble prototype; provisional items await client sign-off, DESIGN.md §10)
- [x] Next.js 16 scaffold, TypeScript strict, Tailwind v4, shadcn/ui, ESLint/Prettier/Husky
- [x] `src/env.ts`, `lib/db.ts`, `lib/logger.ts`, `instrumentation.ts`, `lib/storage.ts` (local + blob), `lib/email.ts` (console + smtp), `lib/ratelimit.ts`, `scripts/db-local.ts`
- [~] CI workflows (`ci.yml`, `security.yml`) → mark them as required checks
- [ ] Vercel project (Preview + Staging) + Blob store, Atlas staging cluster. First deploy of the empty app

### Preview spike (≈ 1 d, throwaway code)
- [ ] Standalone test page: one H.264 creator video + 3 preloaded burst clips, cut-in playback per ADR-0004
- [ ] Measure start offset and gap at each cut on Chrome, desktop Safari and iOS Safari against G3 (±100 ms, ≤ 100 ms gap)
- [ ] Record the numbers and the chosen approach in ADR-0004. If G3 is missed, write a new ADR with the alternative (e.g. the MSE splice rejected in ADR-0004) and raise the trade-off with the client before Phase 1C

The design system and the scaffold can run in parallel. The scaffold doesn't depend on styling (unstyled shadcn defaults plus `TODO(design)` until DESIGN.md is approved).

---

## Phase 1A. Business side (≈ 6 d, incl. 1 d feedback)

**Entry:** Phase 0 exit met.
**Exit:** E2E paths 1, 2, 5 and the business/admin half of path 6 (PRD §13) are green on Staging.
**Client inputs needed:** SMTP mailbox credentials for Staging verification emails (until then Staging uses the console transport, and the demo uses a pre-verified account).

### M1. Accounts (≈ 2 d)
- [x] AUTH-01 Sign up with role
- [x] AUTH-02 Email verification
- [x] AUTH-03 Log in / log out
- [x] AUTH-04 Forgot / reset password
- [x] AUTH-05 Route protection
- [x] PRF-01 Onboarding
- [x] PRF-02 Edit profile

### M2. Business ads (≈ 2.5 d)
- [x] AD-01 Upload burst ad (storage adapter, upload token, finalize + server-side duration check)
- [x] AD-02 Processing failure & retry
- [x] AD-03 My ads dashboard
- [x] AD-04 Ad detail
- [x] AD-05 Edit ad
- [x] AD-06 Unlist / relist
- [x] AD-07 Delete ad

### Admin, pulled forward (≈ 0.5 d)
- [x] ADM-02 Review queue (approve / reject with reason, moderation log)
- [x] Seed script: one admin account (admins are not created through sign-up)

**Checkpoint A: client demo of the business side.** Business signs up, uploads, admin approves, ad is live. Rejection and resubmission.

---

## Phase 1B. Marketplace & creator library (≈ 3 d)

**Entry:** Checkpoint A done (feedback folded in or logged to the backlog).
**Exit:** a creator can search, save ads and upload a video on Staging. The creator half of path 6 is green.

### M3. Marketplace (≈ 2 d)
- [x] MKT-01 Browse
- [x] MKT-02 Search, filter, sort
- [x] MKT-03 Ad detail page
- [x] MKT-04 Save / unsave
- [x] MKT-05 Saved ads page

### M4. Creator videos (≈ 1 d)
- [x] VID-01 Upload video (signed playback)
- [x] VID-02 My videos

---

## Phase 1C. Editor & preview (≈ 5.5 d, incl. 1 d feedback)

**Entry:** Phase 1B exit met. Spike result accepted.
**Exit:** E2E paths 3 and 4 are green on Staging. G3 timing is measured and meets target on Chrome, desktop Safari and iOS Safari.

### M5. Projects & editor (≈ 2.5 d)
- [ ] PRJ-01 Create project
- [ ] PRJ-02 Editor layout
- [ ] PRJ-03 Place and adjust bursts
- [ ] PRJ-04 Save (auto-save)
- [ ] PRJ-05 Projects list
- [ ] PRJ-06 Reopen
- [ ] PRJ-07 Unavailable ads

### M6. Preview (≈ 2 d)
- [ ] PRV-01 Composite playback (G3 timing on Chrome + Safari + iOS), built on the spike's approach
- [ ] PRV-02 Controls
- [ ] PRV-03 Preview from editor
- [ ] PRV-04 Mobile playback

**Checkpoint B: client demo of the marketplace and creator flow.** The full J2 journey, plus an unlisted ad showing as *Unavailable*.

---

## Phase 1D. Admin, hardening & launch (≈ 3 d)

**Entry:** Checkpoint B done.
**Exit (= launch criteria):** G1–G5 met. E2E paths 1–6 green on **production**. No open P0/P1 bugs.
**Client inputs needed:** production domain (OQ-8), production SMTP credentials, Vercel Pro plan for Production, Atlas production cluster tier.

### M7. Admin (≈ 1 d)
- [ ] ADM-01 Overview
- [ ] ADM-03 Content moderation
- [ ] ADM-04 Users (Should)

### M8. Hardening & launch (≈ 2 d)
- [ ] E2E paths 1–6 (PRD §13) green on Staging
- [ ] Cron cleanup, rate limits, security headers, CSP
- [ ] Accessibility pass (WCAG 2.2 AA, PRD §12) and performance check (LCP, p95)
- [ ] Cross-browser QA matrix (PRD §12)
- [ ] Production environment: Vercel Production (Pro plan), Blob store, Atlas production cluster, domain, SMTP
- [ ] Seed scripts, handover notes
- [ ] E2E paths 1–6 green on Production

**Checkpoint C: launch**

---

## Phase 2. Post-MVP

Not committed. Tracks are ordered by expected value. Each is re-estimated and confirmed with the client after launch. Items come from PRD §17.

| Order | Track | Contents | Notes |
| --- | --- | --- | --- |
| 2.0 | Hypercare (≈ 2 weeks after launch) | Bug fixes, monitoring, first PRD §3.2 metrics read-out | Always first |
| 2.1 | Engagement | Email notifications (approved, rejected, ad used), "where my ad is used" for businesses | Uses the existing SMTP transport |
| 2.2 | Rendered export | Downloadable MP4 | Needs a render worker outside Vercel (ARCHITECTURE §8.3): a new platform, so a new ADR is required. +1–2 weeks |
| 2.3 | Discovery | Public Marketplace + SEO, fuzzy search and autocomplete | Depends on OQ-6 |
| 2.4 | Placement control | Overlay placements, business placement preferences | Overlay changes the preview engine (ADR-0004) |
| 2.5 | Accounts & admin | User suspension, self-serve account deletion | Better Auth admin plugin (ADR-0002) |
| 2.6 | Analytics | Views and completion for businesses and creators | |
| 2.7 | Monetisation | Payments and payouts (Stripe Connect) | Depends on F1/OQ-11. A third platform, so it supersedes the ADR-0005 rule through a new ADR. Largest track |

## Decision log (client answers)
Record answers to [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md) here, then fold them into the PRD. Questionnaire status: **top 5 sent 2026-10-02** (D1, C1, B1, E1, F1). Until answered, the suggested answers are in effect (PRD A7).

| Client Q | PRD OQ | Answer | Date | Folded into PRD version |
| --- | --- | --- | --- | --- |
| D1 | OQ-2 | *Provisional:* preview only, no download | 2026-10-02 | 1.0-draft |
| C1 | OQ-9 | *Provisional:* cut-in (video pauses) | 2026-10-02 | 1.0-draft |
| B1 | OQ-3 | *Provisional:* 0.5–2 s | 2026-10-02 | 1.0-draft |
| E1 | OQ-1 | *Provisional:* free use, no approval | 2026-10-02 | 1.0-draft |
| F1 | OQ-11 | *Provisional:* no payments in MVP | 2026-10-02 | 1.0-draft |
