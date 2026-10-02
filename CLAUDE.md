@AGENTS.md

# Claude Code specifics

The shared rules above apply in full. This section only adds Claude Code tooling.

## Project skills (`.claude/skills/`)

| Skill | Use it for |
| --- | --- |
| `/implement <PRD-ID…>` | End-to-end delivery of one or more requirements: plan → build → test → docs → roadmap |
| `/adr <title>` | Record a significant technical decision as a numbered ADR |
| `/open-pr` | Commit, push and open a PR into `staging` following GIT_WORKFLOW (user-invoked only) |

## Subagents (`.claude/agents/`)

- `acceptance-verifier`: read-only check of an implementation against the PRD acceptance criteria. Run it after `/implement`, before opening a PR.

## Hooks & settings

- `.claude/settings.json`: shared permissions (secrets are unreadable, no force-push, no direct pushes to `main`/`staging`) and a PostToolUse hook that runs Prettier on edited files once the app is scaffolded.
- Personal overrides go in `.claude/settings.local.json` (gitignored).

## Working style

- Use plan mode for anything touching more than about 3 files, a schema, or the preview engine.
- Keep context lean: read the specific doc sections a task needs instead of whole folders.
- For library APIs that change quickly (Next.js 16, Better Auth, Mux, Tailwind v4), check the current official docs rather than relying on memory.
- This repo runs on Windows. Prefer cross-platform npm scripts and Node-based tooling over shell-specific scripts.
