# Architecture

> **How** Flashd is built. Product behaviour lives in [PRD.md](../product/PRD.md); this doc must implement it, never redefine it.
> Schemas: [DATA_MODEL.md](DATA_MODEL.md) · Endpoints and actions: [API.md](API.md) · Code rules: [CONVENTIONS.md](CONVENTIONS.md) · Why we chose X: [decisions/](../decisions/README.md)

Last updated: 2026-10-02 (lean stack, [ADR-0005](../decisions/0005-lean-service-stack.md))

---

## 1. Stack

**External platforms: Vercel and MongoDB Atlas only.** Everything else is a library or our own code ([ADR-0005](../decisions/0005-lean-service-stack.md)).

| Layer | Choice | Notes / ADR |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, TypeScript strict, React 19) | Server Components by default, Server Actions for mutations, Route Handlers for upload tokens, search and cron. [ADR-0001](../decisions/0001-core-stack.md) |
| Hosting | **Vercel** (Fluid compute) | Preview deploy per PR, `staging` and `main` environments, Vercel Cron. Production needs the Pro plan |
| Database | **MongoDB Atlas** + **Mongoose** | Cached connection, `attachDatabasePool` from `@vercel/functions` |
| Auth | **Better Auth** (library) | Email + password, verification, reset, database sessions, built-in rate limiting stored in Mongo. [ADR-0002](../decisions/0002-auth-better-auth.md) |
| Media storage | **Vercel Blob** (part of Vercel) via `lib/storage.ts` | Drivers: `blob` (deployed) and `local` (dev, `.data/uploads`) |
| Media inspection | `mp4box.js` (browser + server), `<video>` + canvas (browser) | Codec check, duration, poster frame. No transcoding |
| Player | Plain HTML5 `<video>` with our own controls | Progressive MP4 with range requests. [ADR-0004](../decisions/0004-burst-preview-engine.md) |
| Email | `lib/email.ts`: `console` transport (dev) or **SMTP** via nodemailer (prod) + React Email templates | Any mailbox the client owns |
| Rate limiting | `lib/ratelimit.ts` on a MongoDB `rateLimits` TTL collection | App endpoints. Auth endpoints use Better Auth's limiter |
| Logging / errors | `lib/logger.ts` (JSON) + `instrumentation.ts` `onRequestError` | Shows up in Vercel runtime logs |
| UI | **Tailwind CSS v4** + **shadcn/ui** | Tokens defined in [DESIGN.md](../design/DESIGN.md) |
| Forms & validation | React Hook Form + **Zod** | Same schema on client and server |
| Client data | TanStack Query | Infinite scroll, upload progress, optimistic save |
| Testing | Vitest (+ `mongodb-memory-server`) · Playwright | [CONVENTIONS.md §Testing](CONVENTIONS.md#testing) |
| Tooling | npm · ESLint · Prettier · Husky + lint-staged · GitHub Actions | |

## 2. System Context

```
┌───────────────────────────┐        ┌─────────────────────────────────────┐
│          Browser          │        │            Vercel (Next.js)          │
│ RSC pages · client islands│◄──────►│ Server Components / Server Actions   │
│ <video> player · mp4box   │        │ Route Handlers /api/* · proxy.ts     │
└──────┬────────────────────┘        │ Cron → /api/cron/cleanup             │
       │ direct multipart upload     └──────┬──────────────────┬───────────┘
       │ (token from /api/uploads/token)    │                  │ SMTP (prod)
       ▼                                    ▼                  ▼
┌──────────────────┐                ┌──────────────┐    ┌──────────────┐
│   Vercel Blob    │◄── head/del ───│ MongoDB Atlas│    │ client's own │
│ videos · images  │                │   Mongoose   │    │   mailbox    │
│ CDN, range reqs  │                └──────────────┘    └──────────────┘
└──────────────────┘
```

**Hard rule:** media bytes never pass through Vercel functions, which cap request bodies at about 4.5 MB. The browser uploads straight to Blob. The one exception is the server-side ad duration check, which reads a file of at most 50 MB from Blob.

## 3. Source Layout

```
src/
  app/                         # Routing only: thin pages, layouts, route handlers
    (marketing)/page.tsx
    (auth)/login|signup|verify-email|forgot-password|reset-password/
    onboarding/
    marketplace/  marketplace/[adId]/
    business/     (page = dashboard) ads/new  ads/[adId]  ads/[adId]/edit  profile/
    creator/      (page = dashboard) videos/  videos/new  saved/  projects/  projects/[projectId]/  profile/
    admin/        review/  ads/  videos/  users/
    api/
      auth/[...all]/route.ts
      uploads/token/route.ts          # Blob client-upload token (videos + images)
      marketplace/route.ts
      cron/cleanup/route.ts
      dev-files/[...path]/route.ts    # dev only: local storage driver upload + serve
  features/<domain>/           # auth, profiles, uploads, ads, marketplace, videos, projects, preview, admin
    components/                # Domain UI (client or server)
    actions.ts                 # Server Actions ("use server")
    queries.ts                 # Server-only reads returning DTOs
    service.ts                 # Business logic and state transitions (pure where possible)
    schemas.ts                 # Zod schemas (shared client/server)
    *.test.ts
  components/ui/               # shadcn primitives
  components/layout/           # App shell, nav, headers
  lib/                         # db, auth, storage, email, ratelimit, permissions, logger, media (mp4box helpers)
  models/                      # Mongoose models (one file per collection)
  config/                      # limits.ts, categories.ts, routes.ts. Constants from the PRD
  emails/                      # React Email templates
  env.ts                       # Zod-validated environment (server/client split)
  instrumentation.ts           # onRequestError → logger
  proxy.ts                     # Next.js 16 proxy (formerly middleware)
tests/e2e/                     # Playwright specs, one per PRD §13 path
tests/fixtures/media/          # Tiny sample clips (H.264 1 s ad, HEVC reject case, 10 s video)
scripts/                       # db-local.ts, seed-admin.ts, seed-demo.ts
```

Dependency direction: `app → features → (lib, models, config)`. A feature never imports another feature's internals, only its exported `queries`/`service`. `components/ui` imports nothing app-specific.

## 4. Rendering & Data Flow

| Concern | Approach |
| --- | --- |
| Landing | Static |
| Marketplace | RSC renders the first page. A client component handles infinite scroll through `/api/marketplace` |
| Role areas | Dynamic RSC per user. Reads go through `features/*/queries.ts` |
| Editor and preview | Client component tree. Initial data comes from RSC props |
| Mutations | Server Actions with the standard pipeline (§6). `revalidatePath`/`revalidateTag` after writes |
| Upload tokens, search API, cron | Route Handlers |

Never return Mongoose documents to the client. Queries use `.lean()` and map to explicit DTO types.

## 5. Auth & Authorization

- Better Auth handles sessions (HTTP-only cookie), email verification (24 h) and password reset (1 h, revokes other sessions). Its collections (`user`, `session`, `account`, `verification`, `rateLimit`) are owned by Better Auth. Do not write to them directly.
- `role` (`business | creator | admin`) is an extra field on `user`. It can be set at sign-up (business/creator only) and cannot be changed by the user afterwards. Admins are created by `scripts/seed-admin.ts`.
- **`proxy.ts` is optimistic only.** It checks that a session cookie exists and redirects to login. It is **not** a security boundary.
- **The real checks run in the server code.** Every Server Action, Route Handler and protected RSC calls `requireUser({ role })` from `lib/permissions.ts`, which validates the session from the DB. Ownership is checked with `assertOwner(doc, user)`.
- Login lockout (5 failures / 15 min / email) runs in a Better Auth `hooks.before` on sign-in using `lib/ratelimit.ts`. Better Auth's own IP-based limiter (database storage) stays on as well.

## 6. Mutation Pipeline (Server Actions)

```
action(input) →
  user = await requireUser({ role })      // 401/403 → typed error
  data = Schema.parse(input)              // Zod
  await ratelimit(bucket, user.id)        // when listed in API.md
  doc = await load(); assertOwner(doc, user)
  result = await service.transition(doc, data)   // state machine; throws DomainError
  revalidate…
  return { ok: true, data } | { ok: false, error: { code, message, fields? } }
```

Server Actions never throw to the client for expected failures. They return `ActionResult<T>`. Unexpected errors are logged (`logger.error` with `requestId`/`userId`) and returned as `{ code: "INTERNAL" }`.

## 7. Media Pipeline

### 7.1 Accepted media (PRD §10)
| Kind | Containers | Video codecs | Checked where |
| --- | --- | --- | --- |
| Burst ad | MP4, MOV | H.264 (`avc1`) | Browser (mp4box + `<video>`), **re-checked on server** (mp4box on the Blob file: codec + duration 0.5–2.0 s ± 0.05) |
| Creator video | MP4, MOV, WebM | H.264, VP8, VP9, AV1 | Browser (mp4box for MP4/MOV, `<video>` decode test for all). Server checks size and content type via `head()` |
| Image | JPG, PNG, WebP ≤ 5 MB | n/a | Token constraints + `head()` |

HEVC (`hvc1`/`hev1`) is rejected with the PRD message telling the user to export as MP4 (H.264).

### 7.2 Upload sequence
```
1. Browser: pick file → validate type/size → mp4box: codec, duration, dimensions
            → <video> loads it (decode test) → canvas grabs poster frame (JPEG)
2. Server Action startUpload({ kind, targetId?, meta, file: { name, size, type, durationSec, width, height, codec } })
     requireUser + role · Zod · ratelimit("upload", 20/h)
     create/patch doc { status: "uploading" } → return { id, videoPath, posterPath }
     (paths like ads/<id>/video, ads/<id>/poster. Random suffix added by storage)
3. Browser: storage.upload(videoPath, file, { multipart, onProgress, abortSignal })
            storage.upload(posterPath, posterJpeg)
     blob driver  → @vercel/blob/client upload() with handleUploadUrl=/api/uploads/token
                    token route: requireUser · doc owned + status uploading · path matches doc
                    · allowedContentTypes + maximumSizeInBytes by kind
     local driver → PUT /api/dev-files/<path> (development only, writes .data/uploads)
4. Server Action finalizeUpload({ id, videoUrl, posterUrl })
     verify URLs belong to our store and the doc's path prefix · head(): size, contentType
     ad: fetch file (≤ 50 MB) → mp4box → codec avc1 + duration 0.5–2.0 s
         ok → status "pending_review" (or pendingVideo for a live ad, PRD AD-05)
         bad → status "failed" + errorMessage, delete blobs
     video: status "ready"
5. Cancel / failure: cancelUpload({ id }) deletes the blobs and marks "failed".
   Abandoned "uploading" docs older than 24 h are cleaned by the cron job.
```
There are no webhooks and no polling: the browser drives the whole flow and the server verifies each step.

### 7.3 Playback
- **Ads:** public Blob URLs (MP4). Marketplace cards show the poster and play the MP4 muted on hover or when in view.
- **Creator videos:** Blob URLs with a random suffix, rendered only on owner/admin pages. They never appear in public APIs. Pages are `noindex`. Hidden or deleted videos are not rendered to non-admins. (Privacy trade-off: [ADR-0005](../decisions/0005-lean-service-stack.md).)
- **Timeline frame thumbnails (PRJ-03 AC2):** generated in the browser by seeking a hidden `<video>` and drawing to canvas. Results are cached per 1 s bucket.

## 8. Preview Engine (PRD §8.6)

Details: [ADR-0004](../decisions/0004-burst-preview-engine.md) (as amended by ADR-0005). Code: `src/features/preview/`.

### 8.1 Timeline model
```ts
type Burst = { id: string; adId: string; atSec: number; durationSec: number; src: string /* blob: URL */ };
// Sorted by atSec. Composite timeline = video time with each burst inserted at atSec.
// toComposite(videoTime) = videoTime + Σ durationSec of bursts with atSec < videoTime
// fromComposite(t) → { kind: "video", videoTime } | { kind: "burst", burstIndex, offset }
```
These pure functions live in `features/preview/timeline.ts`. They are the most heavily unit-tested code in the repo, covering boundaries, bursts at 0 and at the end, adjacent bursts, and seeks.

### 8.2 Playback
- **Layer 1:** `<video>` for the creator MP4 (`preload="auto"`, `playsInline`), with native controls hidden.
- **Layer 2:** one `<video>` for bursts, stacked on top, `object-fit: contain` on black. When the editor opens, every distinct ad is fetched into memory (`fetch → Blob → URL.createObjectURL`). Clips are at most 2 s, so switching has no network latency.
- **Burst trigger:** `timeupdate` fires only about every 250 ms, which is too coarse. Use `requestVideoFrameCallback` on the main video (falling back to `requestAnimationFrame` polling). When `nextBurst.atSec - currentTime ≤ one frame`, pause the main video, play the burst from 0, and show the "Ad" label. On `ended`, hide the layer and resume the main video.
- **Seek:** `fromComposite` works out the target. Seeking into a burst seeks the main video to `atSec`, pauses it, and plays the burst from `offset`.
- **Controls:** a custom bar shows composite time with burst segments highlighted. Keyboard shortcuts follow PRV-02.
- **iOS:** the first play needs a user gesture, so the burst element is "unlocked" during that gesture (play/pause once).
- **Measurement:** `?debugPreview=1` logs the scheduled vs actual start of each burst, to check G3 (±100 ms).

### 8.3 Phase 2: rendered export
FFmpeg rendering does not fit Vercel functions. The planned path is a job record in Mongo, a worker on a container platform that concatenates segments and uploads the result to Blob, and a callback to the app.

## 9. Security

- Session, role and ownership are checked server-side on every mutation (§5). Zod validates every input. Mongoose `strict` mode is on. Query filters are built only from Zod-parsed scalars (strings, enums, ObjectIds), so user input can never inject operators. The global Mongoose `sanitizeFilter` option is **not** used: it rejects `$text` and needs `trusted()` on every nested operator, which the Marketplace search depends on.
- Upload tokens are scoped to one pre-created doc and path, with content type and size limits. `finalizeUpload` re-verifies everything and never trusts client-reported metadata for ads.
- Rate limits (PRD §10) are enforced through `lib/ratelimit.ts`.
- Headers in `next.config.ts`: CSP (media and images from the Blob store host), HSTS, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`.
- Secrets are only read from `src/env.ts`. Only `NEXT_PUBLIC_*` values reach the client.
- The `local` storage driver and `/api/dev-files` are refused when `NODE_ENV=production`.

## 10. Background Jobs

| Job | Trigger | Work |
| --- | --- | --- |
| `cleanup` | Vercel Cron, daily 04:00 UTC (`vercel.json`), `/api/cron/cleanup` (Bearer `CRON_SECRET`, timing-safe compare) | `features/maintenance/cleanup.ts`: uploads reserved more than 24 h ago fail (new ads/videos) or lose their reservation (replacements on existing ads), and their reserved objects are deleted. Media of deleted or removed ads is purged after a 7-day grace period, once (`ads.mediaPurgedAt`). Creator videos delete their media immediately on delete |

## 11. Environments & Deployment

| Environment | Git branch | Vercel | MongoDB | Storage | Email |
| --- | --- | --- | --- | --- | --- |
| Local | any | `next dev` | Local `mongod` via `npm run db:local` (single-node replica set `rs0` on :27017, persistent `.data/mongo`), or Atlas dev | `local` driver | `console` |
| Preview | PR branches | Preview deployments | Atlas `staging` DB | Blob (staging store) | `console` (links logged) |
| Staging | `staging` | Branch domain / custom env | Atlas `staging` DB | Blob (staging store) | SMTP |
| Production | `main` | Production (Pro plan) | Atlas `production` cluster | Blob (prod store) | SMTP |

Vercel's Git integration deploys the app. GitHub Actions only verifies the code (see [GIT_WORKFLOW.md](GIT_WORKFLOW.md)).

### 11.1 Environment variables
The canonical list is [`.env.example`](../../.env.example), validated at boot by `src/env.ts`. When you add a variable, update `.env.example`, `src/env.ts` and the Vercel project, in the same PR. Local secrets live in `.env.local` (gitignored, never read by agents).

Variables read by `src/env.ts` (validation is lazy, so `next build` needs no runtime secrets; errors name the variable, never its value):

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | Database name comes from the URI path |
| `BETTER_AUTH_SECRET` | yes | ≥ 32 chars |
| `BETTER_AUTH_URL` | no | Defaults to `NEXT_PUBLIC_APP_URL` |
| `NEXT_PUBLIC_APP_URL` | no | Default `http://localhost:3000`. Used in email links |
| `STORAGE_DRIVER` | no | `local` (default; refused only on Vercel) or `blob` |
| `STORAGE_LOCAL_DIR` | no | Folder of the `local` driver. Default `<app>/.data/uploads` (also used self-hosted, ADR-0007) |
| `BLOB_READ_WRITE_TOKEN` | with `blob` | Vercel Blob store token |
| `EMAIL_TRANSPORT` | no | `console` (default) or `smtp` |
| `EMAIL_FROM` | no | Sender for SMTP |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | with `smtp` | Client-owned mailbox |
| `CRON_SECRET` | yes | ≥ 16 chars, Bearer token for `/api/cron/*` |
| `LOG_LEVEL` | no | `debug` · `info` (default) · `warn` · `error` |
| `MONGODB_DNS_SERVERS` | no | Comma-separated extra DNS servers for `mongodb+srv` lookups (hosts whose resolver refuses SRV). Development adds 1.1.1.1/8.8.8.8 automatically |
| `FLASHD_APP_PORT` | no | Self-hosted ops only (pm2 / cron script, not read by the app): internal `next start` port, default 3001. Must match the upstream in `ops/nginx/nginx.conf` |
| `E2E_MODE` | no | **E2E only.** Lets a production build use the `local` storage driver and the console-email outbox. Never set on Vercel |

DNS note: `lib/db.ts` appends `MONGODB_DNS_SERVERS` (or, in development, 1.1.1.1/8.8.8.8) for `mongodb+srv` URIs, because some Windows setups list a local resolver that refuses SRV queries (`querySrv ECONNREFUSED`).

**Self-hosted production (ADR-0007):** the client's Windows Server runs the app from the repo folder: nginx on port 80 (`ops/nginx/nginx.conf`) proxies to `next start` on `127.0.0.1:3001`, and pm2 (`ecosystem.config.cjs`) runs the app, nginx and the daily cleanup cron, restored at boot by `pm2 resurrect`. Settings live in the gitignored `.env.production.local`, media in `.data/uploads`. See README "Deploying on Windows Server".

## 12. Observability

- `lib/logger.ts` writes structured JSON (`level`, `msg`, `requestId`, `userId`, `docId`), viewed in Vercel runtime logs.
- `instrumentation.ts` `onRequestError` logs every unhandled server error with route and context.
- React error boundaries show a friendly message, and a small server action records client errors through the same logger.
- Optional and built into Vercel: Web Analytics and Speed Insights, for the LCP target (PRD §12).
