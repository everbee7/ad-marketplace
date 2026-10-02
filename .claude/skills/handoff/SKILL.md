---
name: handoff
description: Record the session so the next one can continue without explanation. Updates docs/ai/STATE.md and docs/ai/SESSION_LOG.md. Use at the end of a work session, after finishing a requirement or milestone, before switching tasks, or when the user says wrap up, handoff, save progress or log this.
argument-hint: "[short session title]"
---

# Handoff: $ARGUMENTS

The goal is that a brand-new session, given only the repo, knows exactly where things stand and what to do next. Write for that reader. Be specific, using file paths, PRD IDs, branch and PR numbers. No narration.

1. **Gather facts.** `git branch --show-current`, `git status --short`, `git log --oneline staging..HEAD` (or `-n 10`), `gh pr list --author @me --state open` if available. Re-read `docs/ai/STATE.md` and the latest entry in `docs/ai/SESSION_LOG.md`.

2. **Append to `docs/ai/SESSION_LOG.md`.** Add a new entry at the top, below the header block, using the format there. If an entry for this same session already exists (same date and session number), update it instead of adding a duplicate. Session numbers go up by one from the previous entry.
   - What changed and why. Decisions made, and where they are recorded (ADR, PRD version).
   - Verification actually run, and its result (don't claim tests you didn't run).
   - Unfinished work, with exact next steps.

3. **Overwrite `docs/ai/STATE.md`.** It is a snapshot, not history. Keep it under about 60 lines:
   - Where we are (milestone, branch, open PRs)
   - Next up (ordered and actionable)
   - Active assumptions (provisional decisions in effect)
   - Blockers / waiting on
   - Gotchas (environment quirks, traps a new session would hit)
   Remove anything no longer true.

4. **Cross-check.** ROADMAP checkboxes match what was delivered. Docs touched by the work follow the update rules in `docs/README.md`.

5. **Commit** the log and state changes together with the work on the current feature branch, using `docs(ai): log session S<n>: <title>` or by including them in the work commit. Never commit directly to `main` or `staging`. If the user hasn't asked for commits, leave the changes staged and say so.
