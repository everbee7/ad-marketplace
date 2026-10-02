@AGENTS.md

# Claude Code specifics

The shared rules above apply in full. This section only adds Claude Code tooling.

## Project skills (`.claude/skills/`)

| Skill | Use it for |
| --- | --- |
| `/implement <PRD-ID…>` | End-to-end delivery of one or more requirements: plan → build → test → docs → roadmap |
| `/adr <title>` | Record a significant technical decision as a numbered ADR |
| `/open-pr` | Commit, push and open a PR into `staging` following GIT_WORKFLOW (user-invoked only) |
| `/handoff [title]` | Record the session in `docs/ai/` (state snapshot + log entry) so the next session continues seamlessly |

## Subagents (`.claude/agents/`)

- `acceptance-verifier`: read-only check of an implementation against the PRD acceptance criteria. Run it after `/implement`, before opening a PR.

## Hooks & settings

- `.claude/settings.json`: shared permissions (secrets are unreadable, no force-push, no direct pushes to `main`/`staging`) plus three hooks:
  - **SessionStart** (`session-context.mjs`): injects `docs/ai/STATE.md`, the last 2 session log entries and git status into context. This is how a new session knows previous work.
  - **Stop** (`require-session-log.mjs`): if there are uncommitted changes but `docs/ai/` wasn't updated, Claude must log the session before finishing.
  - **PostToolUse** (`format-on-edit.mjs`): Prettier on edited files, once the app is scaffolded.
- Personal overrides go in `.claude/settings.local.json` (gitignored).

## Working style

- Use plan mode for anything touching more than about 3 files, a schema, or the preview engine.
- Keep context lean: read the specific doc sections a task needs instead of whole folders.
- For library APIs that change quickly (Next.js 16, Better Auth, Vercel Blob, mp4box.js, Tailwind v4), check the current official docs rather than relying on memory.
- This repo runs on Windows. Prefer cross-platform npm scripts and Node-based tooling over shell-specific scripts.
