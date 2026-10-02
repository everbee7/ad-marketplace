---
name: adr
description: Record an Architecture Decision Record in docs/decisions. Use when choosing or replacing a library, provider or framework, changing a data-model pattern, or trading off a PRD target.
argument-hint: <decision title>
---

# Record ADR: $ARGUMENTS

1. List `docs/decisions/` and pick the next number (4 digits, zero-padded).
2. Copy the structure of `docs/decisions/0000-template.md` into `docs/decisions/NNNN-<kebab-title>.md`.
3. Fill in Context (cite PRD IDs and constraints), Decision, Alternatives considered (at least 2, each with a concrete "why not"), and Consequences (including how to reverse it).
4. Status is `Proposed` unless the user has already agreed, in which case it is `Accepted`. Use today's date.
5. If it supersedes an ADR, set the old one's status to `Superseded by ADR-NNNN` (change nothing else in it).
6. Add a row to the table in `docs/decisions/README.md`.
7. If the decision changes the stack or behaviour, update `docs/engineering/ARCHITECTURE.md` (and the PRD if product behaviour changes) so they link to the new ADR.
