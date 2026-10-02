---
name: implement
description: Deliver one or more PRD requirements end to end (plan, build, test, update docs and roadmap). Use when asked to implement, build or work on a feature identified by a PRD ID such as AUTH-01, AD-03, PRJ-03, or a whole milestone like M2.
argument-hint: <PRD-ID…> | <milestone>
---

# Implement PRD requirement(s): $ARGUMENTS

Follow these steps in order. Do not skip verification or the doc updates.

## 1. Understand
- Read the requirement(s) and their acceptance criteria in `docs/product/PRD.md`. Read the related rules in §9 (lifecycles) and §10 (limits).
- Check `docs/product/ROADMAP.md`: confirm prerequisites are done and the item isn't already `[x]`.
- Read only the relevant sections of `docs/engineering/ARCHITECTURE.md`, `DATA_MODEL.md` and `API.md`, plus any ADR they link.
- Look at the existing code in `src/features/<domain>/` and follow its patterns.
- If an AC is ambiguous, use the PRD §15 default. If there is none, ask the user before building.

## 2. Plan
Present a short plan before editing:
- Files to create or change (routes, feature modules, models, config)
- Schema, API or env changes, and the doc each one requires
- Tests: one or more per AC, named `"<ID> <title>"`
- Branch name: `feat/<id-lowercase>-<slug>` from `staging`

For work touching more than about 3 files, schemas or the preview engine, wait for the user's OK on the plan.

## 3. Build
- Follow `AGENTS.md` non-negotiables and `docs/engineering/CONVENTIONS.md`.
- Server first: schema → model → service (transitions) → queries/actions/handlers → UI.
- UI: if `docs/design/DESIGN.md` is still undefined, use shadcn defaults and mark `// TODO(design)`.
- For library APIs (Next.js 16, Better Auth, Vercel Blob, mp4box.js, Tailwind v4), check the current docs rather than memory.

## 4. Verify
- Run `npm run check` and fix everything it reports.
- For UI flows, run the app and exercise every AC, including empty, loading and error states.
- Optionally run the `acceptance-verifier` subagent with the requirement IDs.

## 5. Document
Apply the update rules table in `docs/README.md`: DATA_MODEL, API, `.env.example`, PRD §10 + `src/config`, ADR if needed. Tick the IDs in `docs/product/ROADMAP.md` (`[~]` while in progress, `[x]` when the ACs are verified).

## 6. Report
Summarise: requirements delivered (per AC: done or gap), files changed, tests added, docs updated, open follow-ups. Propose the Conventional Commit message(s). Do not commit or push unless asked. `/open-pr` handles that.
