# Documentation Map

Read this first. It explains what each doc is for, which one wins when they disagree, and when to update each.

## Hierarchy

```
product/JOB_DESCRIPTION.md        Client brief. Original input, never edited
product/CLIENT_QUESTIONS.md       Plain-language questionnaire. Answers flow into the PRD
        │                         (via the ROADMAP decision log)
        ▼
product/PRD.md                    WHAT & WHY: requirements (IDs + acceptance criteria)
        │                         ← source of truth for behaviour
        ├──► design/DESIGN.md     HOW IT LOOKS: tokens, components, screens
        │
        ├──► engineering/ARCHITECTURE.md   HOW IT WORKS: stack, flows, preview engine
        │       ├── DATA_MODEL.md          collections, indexes, invariants
        │       ├── API.md                 route handlers, server actions, DTOs
        │       └── CONVENTIONS.md         code, testing, naming rules
        │
        ├──► decisions/ (ADRs)             WHY THIS WAY: one file per significant choice
        │
        └──► product/ROADMAP.md            WHEN & STATUS: milestones, requirement checkboxes
                          │
                          ▼
                        code (src/), tests reference PRD IDs
```

Session continuity: [ai/STATE.md](ai/STATE.md) (current snapshot) + [ai/SESSION_LOG.md](ai/SESSION_LOG.md) (history). Read first in every new session.
Process docs: [engineering/GIT_WORKFLOW.md](engineering/GIT_WORKFLOW.md) (branches, commits, PRs, CI/CD).
Agent instructions: [/AGENTS.md](../AGENTS.md) (all agents), [/CLAUDE.md](../CLAUDE.md) (Claude Code specifics).

## Precedence when docs conflict

1. **PRD** for product behaviour (what users can do, rules, limits, messages).
2. **ADRs** (Accepted) for technical choices. A new ADR can supersede an older one.
3. **ARCHITECTURE / DATA_MODEL / API** for implementation details. They must conform to 1 and 2.
4. **DESIGN** for visual decisions.
5. **Code** is the last word on *current* behaviour. If code and docs differ, that is a bug in one of them. Fix it, don't ignore it.

## Update rules

| When you change… | Update in the same PR |
| --- | --- |
| A user-visible behaviour, rule, limit or message | PRD (bump the change log) + `src/config/*` if it's a limit |
| A collection, field or index | DATA_MODEL.md |
| Answers from the client | ROADMAP decision log → PRD (version bump) |
| A route handler, server action or DTO | API.md |
| An env var | `.env.example` + `src/env.ts` + ARCHITECTURE §11 |
| A significant technical choice | New ADR + decisions/README.md index |
| Delivered a requirement | Tick it in ROADMAP.md |
| Finished a work session (or a requirement) | ai/STATE.md (overwrite) + ai/SESSION_LOG.md (new entry) |
| A visual token or component pattern | DESIGN.md |

## Index

| Doc | Purpose | Status |
| --- | --- | --- |
| [ai/STATE.md](ai/STATE.md) | Where we are, next steps, gotchas | Living (snapshot) |
| [ai/SESSION_LOG.md](ai/SESSION_LOG.md) | What each session did | Living (append-only) |
| [product/JOB_DESCRIPTION.md](product/JOB_DESCRIPTION.md) | Original client brief | Frozen |
| [product/CLIENT_QUESTIONS.md](product/CLIENT_QUESTIONS.md) | Scope questions for the (non-technical) client | Ready to send |
| [product/PRD.md](product/PRD.md) | Product requirements | v1.0-draft |
| [product/ROADMAP.md](product/ROADMAP.md) | Milestones and status | Living |
| [design/DESIGN.md](design/DESIGN.md) | Design system | v0.1 (from Bubble prototype; provisional parts await client sign-off) |
| [engineering/ARCHITECTURE.md](engineering/ARCHITECTURE.md) | Technical design | Draft |
| [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md) | MongoDB schema | Draft |
| [engineering/API.md](engineering/API.md) | Server entry points | Draft |
| [engineering/CONVENTIONS.md](engineering/CONVENTIONS.md) | Code and test rules | Active |
| [engineering/GIT_WORKFLOW.md](engineering/GIT_WORKFLOW.md) | Branching, PRs, CI/CD | Active |
| [decisions/](decisions/README.md) | ADRs | Living |
| [product/archive/](product/archive/) | Superseded drafts, for history only. **Agents: do not use as a source** | Archived |
