---
name: open-pr
description: Commit the current work and open a pull request into staging following docs/engineering/GIT_WORKFLOW.md.
disable-model-invocation: true
argument-hint: "[extra context for the PR description]"
---

# Open a PR into `staging`

Follow `docs/engineering/GIT_WORKFLOW.md` exactly.

1. **Preflight**
   - `git status` and `git diff`. Make sure no `.env*` files (except `.env.example`) and no media files are staged.
   - The current branch must be `feat|fix|chore|docs/<slug>`, not `main` or `staging`. If you are on one of those, create a properly named branch first.
   - Run `npm run check` (once scaffolded). Do not continue if it fails. Report the failures instead.
   - Confirm the docs update rules in `docs/README.md` were applied (ROADMAP ticks, DATA_MODEL/API/env changes).
2. **Commit**
   - Split into logical Conventional Commits: `<type>(<scope>): <imperative summary ≤72>`, a body explaining *why*, and `Refs: <PRD-IDs>`.
3. **Push** the branch: `git push -u origin <branch>`.
4. **PR**: `gh pr create --base staging` with:
   - Title: `<type>(<scope>): <summary>` (≤ 72 characters)
   - Body: fill in every section of `.github/PULL_REQUEST_TEMPLATE.md`, or write `N/A, <reason>`. List the PRD IDs and AC coverage.
5. Report the PR URL and the CI status (`gh pr checks`).

Never push to `main` or `staging` directly, never force-push, and never merge.

Extra context from the user: $ARGUMENTS
