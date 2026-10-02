# Engineering Conventions

> Detailed code rules. [AGENTS.md](../../AGENTS.md) holds the short, must-follow summary; this file is the long form.

## TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`. No `any`. Use `unknown` and narrow it. No `as` casts except at validated boundaries.
- Infer types from Zod (`z.infer`) instead of writing them twice.
- Use named exports. Default exports only where Next.js requires them (`page`, `layout`, `route`, etc.).
- Path alias: `@/` → `src/`.

## Next.js
- Server Components by default. Add `"use client"` only for interactivity, and keep client islands small.
- Server-only modules (`lib/*`, `models/*`, `features/*/queries.ts`, `features/*/service.ts`) start with `import "server-only"`.
- Mutations: Server Actions using the pipeline in [ARCHITECTURE §6](ARCHITECTURE.md#6-mutation-pipeline-server-actions). Upload tokens, search API, cron: Route Handlers.
- Never trust `proxy.ts` for authorization. Call `requireUser()` in every action, handler and protected page.
- Read env vars only through `src/env.ts`.
- Use `next/image` for images. Allow the Blob store host in `next.config.ts`.

## Data
- All DB access goes through `src/models/*` and `features/*/queries.ts|service.ts`. Pages never import models directly.
- Status changes go only through service transition functions, which encode the PRD §9 lifecycle tables.
- Use `.lean()` for reads and map to DTOs. Never send a raw document to the client.
- Keep denormalised counters (`saveCount`, `projectCount`, `businessName`) in sync in the same service call that changes the source.

## Validation & errors
- One Zod schema per input, in `features/*/schemas.ts`, used by both the form (RHF resolver) and the server.
- Domain errors are a `DomainError` with a stable `code`, mapped to `ActionResult` or an HTTP status.
- User-facing messages come from the PRD when it specifies them, word for word.

## UI
- Use shadcn/ui primitives from `components/ui`. Domain components live in `features/*/components`.
- Styling uses Tailwind utilities and design tokens only (see [DESIGN.md](../design/DESIGN.md)). No hard-coded colours or arbitrary pixel values when a token exists.
- Every async action has loading, success and error states. Use toasts for transient feedback and inline messages for field errors.
- Accessibility: use semantic elements, label every control, keep a visible focus ring, honour `prefers-reduced-motion`.

## Naming
- Files: `kebab-case.ts(x)`. Components: `PascalCase`. Hooks: `useThing`. Server Actions: verb first (`saveAd`).
- Collections: camelCase plural (`creatorVideos`). Status enum values: `snake_case`.
- Routes and segments: kebab-case.

## Testing
| Layer | Tool | What to cover |
| --- | --- | --- |
| Unit | Vitest | Zod schemas, state transitions, `timeline.ts` (preview mapping), permission helpers, limits |
| Integration | Vitest + `mongodb-memory-server` | Services and actions against a real Mongo. Upload finalize flow with fixture clips (`tests/fixtures/media/`), incl. HEVC and out-of-range ads |
| E2E | Playwright | One spec per PRD §13 path, in `tests/e2e/`. Media uses tiny fixture clips in `tests/fixtures/media/` and the `local` storage driver. `scripts/e2e-server.mjs` starts an in-memory MongoDB + `next dev` on :3100 so E2E never touches the dev database. A smoke run happens against the preview URL |

- **Media fixtures are generated, never committed** (`.gitignore` + `security.yml`): `npm run fixtures:media` uses `ffmpeg-static` to create H.264, HEVC, VP9 and out-of-range clips in `tests/fixtures/media/`.
- `mongodb-memory-server` is pinned to MongoDB **7.0.24** (`package.json` → `config.mongodbMemoryServer`): the 8.x Windows binary crashes with an illegal-instruction error on CPUs without AVX2.
- Name tests after the requirement: `describe("PRJ-03 place and adjust bursts", …)`.
- A bug fix starts with a failing test that reproduces it.
- Do not mock what you own. Mock only what crosses the network (Vercel Blob API, SMTP). Use the `local` storage driver and `console` email in tests instead of mocks where possible.

## Commands (once scaffolded in M0)
| Command | Purpose |
| --- | --- |
| `npm run db:local` | Local MongoDB (persistent `.data/mongo`, no install) |
| `npm run dev` | Dev server |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` | Prettier write |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run fixtures:media` | Generate media fixtures |
| `npm run format:check` | Prettier check (CI) |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run build` | Production build |
| `npm run seed:admin` / `npm run seed:demo` | Seed scripts |
| `npm run check` | lint + typecheck + test (run before every PR) |

## Dependencies
- Before adding a dependency, check that the stack doesn't already cover the need. If the choice is significant (state, data, video, auth, styling), write an ADR.
- Pin exact versions (`save-exact=true` in `.npmrc`). Renovate/Dependabot handles upgrades.
