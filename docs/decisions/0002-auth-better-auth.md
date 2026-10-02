# ADR-0002: Authentication with Better Auth

- **Status:** Accepted
- **Date:** 2026-10-02
- **Related:** AUTH-01..05, PRF-01

## Context
We need email + password auth with verification, password reset, revoking other sessions on reset, login rate limiting, and a role per user. The draft PRD used Auth.js with a custom token collection. Auth.js is now maintained under the Better Auth project, which recommends Better Auth for new projects.

## Decision
Use **Better Auth** with its MongoDB adapter: email/password, email verification (Resend), password reset with session revocation, database sessions, and `role` + `onboardingCompleted` as extra user fields. Admins are created by a seed script.

## Alternatives considered
| Option | Why not |
| --- | --- |
| Auth.js v5 Credentials | Credentials provider discourages DB sessions. Verification and reset would be hand-built |
| Clerk / Auth0 | Per-MAU cost and an external dependency for core user data. The client prefers to own the data |
| Hand-rolled | Security risk and time |

## Consequences
- The `user`, `session`, `account` and `verification` collections are owned by Better Auth. App code must not write to them directly.
- `proxy.ts` can only do an optimistic cookie check. Real checks happen server-side through `requireUser()`.
- The Better Auth admin plugin (ban/impersonate) is available for Phase 2 suspension.
