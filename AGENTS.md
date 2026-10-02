# AGENTS.md

Instructions for any AI coding agent (Claude Code, Codex, Cursor, …) working in this repo. Keep this file short; the long form lives in `docs/`.

## Project

**Flashd** is a web marketplace where businesses publish **burst ads** (0.5–2 s clips) and creators insert them into their own videos, preview the result in the browser, and save it as a project.
Stack: Next.js 16 (App Router, TS strict) · MongoDB Atlas + Mongoose · Vercel (+ Blob, Cron) · Better Auth · Tailwind v4 + shadcn/ui · Zod · Vitest + Playwright.
**Only two external platforms, Vercel and MongoDB** (ADR-0005). Don't add a third-party service. Build it in-house or propose an ADR.

## Session continuity (read first)

Work spans many sessions. A new session must never need the user to re-explain earlier ones.
- **Start:** read `docs/ai/STATE.md` (current snapshot) and the latest entries in `docs/ai/SESSION_LOG.md`, then `git log`. Claude Code injects these automatically at session start.
- **During:** record decisions in the repo (PRD, ADR, docs), never only in chat. Chat history is not a record.
- **End**, or after each finished requirement: overwrite `docs/ai/STATE.md` and add a `docs/ai/SESSION_LOG.md` entry (Claude Code: `/handoff`). Commit them with the work.

## Read before working

| Need | Read |
| --- | --- |
| Current state, next steps, gotchas | `docs/ai/STATE.md` |
| Map of all docs and which wins in a conflict | `docs/README.md` |
| What to build, acceptance criteria | `docs/product/PRD.md` (requirement IDs like `PRJ-03`) |
| What's done and what's next | `docs/product/ROADMAP.md` |
| How it's built | `docs/engineering/ARCHITECTURE.md`, `DATA_MODEL.md`, `API.md` |
| Code rules | `docs/engineering/CONVENTIONS.md` |
| Branches, commits, PRs | `docs/engineering/GIT_WORKFLOW.md` |
| Why a choice was made | `docs/decisions/` |
| Visual style | `docs/design/DESIGN.md` (**not defined yet:** don't invent styles) |

Read only what the task needs. Never use `docs/product/archive/` as a source.

## Commands

Available after M0 scaffold. `npm run check` = lint + typecheck + test.

```
npm run dev | build | lint | typecheck | test | test:e2e | check | format
```

## Workflow

1. **Locate the requirement.** Find the PRD ID(s) and acceptance criteria. If the task has no ID and changes behaviour, stop and propose a PRD change first.
2. **Explore and plan.** Read the relevant engineering docs and code. For anything beyond a small fix, state the plan (files, schema/API changes, tests) before editing.
3. **Implement** in small steps on a `feat|fix|chore|docs/<slug>` branch cut from `staging`.
4. **Verify.** Write or extend tests named after the requirement ID. Run `npm run check`. For UI, run the app and exercise the flow.
5. **Update docs in the same change** (see the update rules in `docs/README.md`). Tick the requirement in ROADMAP.
6. **Commit** with Conventional Commits that reference the PRD IDs. Open PRs into `staging` using the PR template.

## Non-negotiable rules

- **Security:** every Server Action, Route Handler and protected page calls `requireUser({ role })` and checks ownership server-side. `proxy.ts` is not a security boundary.
- **Validation:** Zod schemas from `features/*/schemas.ts` on every input, shared by client and server.
- **Media bytes never pass through Vercel functions.** The browser uploads directly through `lib/storage.ts` (Blob client upload). The server verifies with `finalizeUpload`.
- **Status changes** go only through `features/*/service.ts` transition functions (PRD §9), and never move a status backwards.
- **Limits and enums** come from `src/config/*`, never literals. They must match PRD §10.
- **No raw Mongoose docs to the client.** Use `.lean()` and map to DTOs.
- **Env vars** only through `src/env.ts`. Never read or print `.env*` secrets. Never commit them.
- **Don't** add dependencies, change the stack, or alter schemas, endpoints or limits without updating the matching doc (and an ADR for significant choices).
- **Don't** push to `main` or `staging`, force-push, or merge PRs unless the user explicitly asks.
- When the PRD is ambiguous, pick the documented default (PRD §15, and "our suggestion" in `CLIENT_QUESTIONS.md`, which are in effect per PRD A7) and note it. Don't silently invent product behaviour.

## Definition of done

- [ ] Acceptance criteria for the PRD ID(s) are met and covered by tests
- [ ] `npm run check` passes, and the build succeeds
- [ ] Loading, empty and error states handled. Keyboard accessible
- [ ] Docs updated per `docs/README.md` rules. ROADMAP ticked
- [ ] `docs/ai/STATE.md` + `docs/ai/SESSION_LOG.md` updated
- [ ] No secrets, no `console.log`, no `TODO` without an owner/issue (except `TODO(design)` until DESIGN.md exists)
