# Architecture

> **How** Flashd is built. Product behaviour lives in [PRD.md](../product/PRD.md); this doc must implement it, never redefine it.
> Schemas: [DATA_MODEL.md](DATA_MODEL.md) · Endpoints and actions: [API.md](API.md) · Code rules: [CONVENTIONS.md](CONVENTIONS.md) · Why we chose X: [decisions/](../decisions/README.md)

Last updated: 2026-10-02

---

## 1. Stack

| Layer | Choice | Notes / ADR |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, TypeScript strict, React 19) | Server Components by default, Server Actions for mutations, Route Handlers for uploads, webhooks and polling. [ADR-0001](../decisions/0001-core-stack.md) |
| Hosting | **Vercel** (Fluid compute) | Preview deploy per PR, `staging` and `main` environments, Vercel Cron |
| Database | **MongoDB Atlas** + **Mongoose** | Cached connection, `attachDatabasePool` from `@vercel/functions` |
| Auth | **Better Auth** (email + password, email verification, password reset, MongoDB adapter) | `role` as an extra user field. [ADR-0002](../decisions/0002-auth-better-auth.md) |
| Video | **Mux Video** (direct upload, transcoding, HLS, MP4 static renditions, thumbnails, webhooks, signed playback) | [ADR-0003](../decisions/0003-video-mux.md) |
| Player | `@mux/mux-player-react` (creator video) + plain `<video>` for preloaded burst clips | [ADR-0004](../decisions/0004-burst-preview-engine.md) |
| Image storage | **Vercel Blob** (client uploads) | Logos, avatars, custom thumbnails |
| Email | **Resend** + React Email | Verification and reset emails |
| UI | **Tailwind CSS v4** + **shadcn/ui** (Radix) | Tokens defined in [DESIGN.md](../design/DESIGN.md) |
| Forms & validation | React Hook Form + **Zod** | The same schema validates on client and server |
| Client data | TanStack Query | Infinite scroll, upload status polling, optimistic save |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Login, uploads, marketplace |
| Monitoring | Sentry (client + server) + Vercel Analytics / Speed Insights | |
| Testing | Vitest (unit/integration, `mongodb-memory-server`) · Playwright (E2E) | See [CONVENTIONS.md §Testing](CONVENTIONS.md#testing) |
| Tooling | npm · ESLint · Prettier · Husky + lint-staged · GitHub Actions | |

## 2. System Context

```
┌──────────────────────────┐      ┌────────────────────────────────────┐
│         Browser          │      │          Vercel (Next.js)          │
│ RSC pages · client islands│◄────►│ Server Components / Server Actions │
│ Mux Player · burst <video>│      │ Route Handlers  /api/*             │
└───────┬─────────┬────────┘      │ proxy.ts (optimistic route guard)  │
        │         │               └───┬──────────┬──────────┬──────────┘
 direct │         │ client upload     │          │          │
 upload ▼         ▼                   ▼          ▼          ▼
┌────────────┐ ┌────────────┐  ┌────────────┐ ┌────────┐ ┌──────────┐
│    Mux     │ │ Vercel Blob│  │MongoDB Atlas│ │ Resend │ │ Upstash  │
│ transcode  │ │ images     │  │  Mongoose  │ │ email  │ │ ratelimit│
│ HLS + MP4  │ └────────────┘  └────────────┘ └────────┘ └──────────┘
└─────┬──────┘                        ▲
      └──── webhooks → /api/webhooks/mux ──┘
```

**Hard rule:** video bytes never pass through Vercel functions. Request bodies are capped at about 4.5 MB, so the browser uploads straight to Mux and images straight to Blob.

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
      uploads/route.ts  uploads/[id]/route.ts
      webhooks/mux/route.ts
      marketplace/route.ts
      playback-token/[videoId]/route.ts
      blob/upload/route.ts
      cron/cleanup/route.ts
  features/<domain>/           # auth, profiles, ads, marketplace, videos, projects, preview, admin
    components/                # Domain UI (client or server)
    actions.ts                 # Server Actions ("use server")
    queries.ts                 # Server-only reads returning DTOs
    service.ts                 # Business logic and state transitions (pure where possible)
    schemas.ts                 # Zod schemas (shared client/server)
    *.test.ts
  components/ui/               # shadcn primitives (generated, lightly edited)
  components/layout/           # App shell, nav, headers
  lib/                         # Infrastructure adapters: db, auth, mux, blob, email, ratelimit, permissions, logger
  models/                      # Mongoose models (one file per collection)
  config/                      # limits.ts, categories.ts, routes.ts. Constants from the PRD
  emails/                      # React Email templates
  env.ts                       # Zod-validated environment (server/client split)
  proxy.ts                     # Next.js 16 proxy (formerly middleware)
tests/e2e/                     # Playwright specs, one per PRD §13 path
scripts/                       # seed-admin.ts, seed-demo.ts
```

Dependency direction: `app → features → (lib, models, config)`. `features/*` never imports another feature's internals, only its exported `queries`/`service`. `components/ui` imports nothing app-specific.

## 4. Rendering & Data Flow

| Concern | Approach |
| --- | --- |
| Landing | Static |
| Marketplace | RSC renders the first page. A client component handles infinite scroll through `/api/marketplace` |
| Role areas (dashboards, lists) | Dynamic RSC per user. Reads go through `features/*/queries.ts` |
| Editor and preview | Client component tree. Initial data comes from RSC props |
| Mutations | Server Actions with the standard pipeline (§6). `revalidatePath`/`revalidateTag` after writes |
| Uploads, webhooks, polling, tokens | Route Handlers |

Never return Mongoose documents to the client. Queries use `.lean()` and map to explicit DTO types.

## 5. Auth & Authorization

- Better Auth handles sessions (HTTP-only cookie), email verification (24 h) and password reset (1 h, revokes other sessions). Its collections (`user`, `session`, `account`, `verification`) are owned by Better Auth. Do not write to them directly.
- `role` (`business | creator | admin`) is an extra field on `user`. It can be set at sign-up (business/creator only) and cannot be changed by the user afterwards. Admins are created by `scripts/seed-admin.ts`.
- **`proxy.ts` is optimistic only.** It checks that a session cookie exists and redirects to login. It is **not** a security boundary.
- **The real checks run in the server code.** Every Server Action, Route Handler and protected RSC calls `requireUser({ role })` from `lib/permissions.ts`, which validates the session from the DB. Ownership is checked with `assertOwner(doc, user)`.
- Login lockout and rate limits run through Upstash (PRD §10).

## 6. Mutation Pipeline (Server Actions)

```
action(input) →
  user = await requireUser({ role })      // 401/403 → typed error
  data = Schema.parse(input)              // Zod
  await ratelimit(user) (when listed in API.md)
  doc = await load(); assertOwner(doc, user)
  result = await service.transition(doc, data)   // state machine; throws DomainError
  revalidate…
  return { ok: true, data } | { ok: false, error: { code, message, fields? } }
```

Server Actions never throw to the client for expected failures. They return `ActionResult<T>`. Unexpected errors are reported to Sentry and returned as `{ code: "INTERNAL" }`.

## 7. Video Pipeline

### 7.1 Upload sequence

```
1. Client validates type/size/duration (hidden <video> reads metadata)
2. POST /api/uploads { kind: "ad" | "video", targetId?, meta }
   server: requireUser + role · Zod · ratelimit
           create/patch doc { status: "uploading" }
           mux.uploads.create({ cors_origin, new_asset_settings: {
               passthrough: `${kind}:${docId}`,
               playback_policy: kind === "ad" ? ["public"] : ["signed"],
               static_renditions (ads only): highest MP4,
               video_quality: "basic" } })
           save muxUploadId → return { id, uploadUrl }
3. Browser uploads directly to uploadUrl (@mux/upchunk), shows progress, can abort
4. Mux → POST /api/webhooks/mux (signature verified)
     video.upload.asset_created   → muxAssetId, status "processing"
     video.asset.ready            → playbackId, durationSec, aspectRatio, maxResolution
                                     ad: validate 0.5–2.0 s (±0.05) else "failed" + delete asset
                                     video: status "ready"
     static rendition ready (ads) → mp4Url ready → status "pending_review"
     video.asset.errored / upload.errored → status "failed", errorMessage
5. Client polls GET /api/uploads/:id every 3 s (TanStack Query) until a final status
```

### 7.2 Webhook rules
- Verify the `mux-signature` with `MUX_WEBHOOK_SECRET`. Reject with 401 if it fails.
- Resolve the doc by `passthrough`, falling back to `muxUploadId`/`muxAssetId`.
- **Idempotent and monotonic.** The status transition table lives in `features/ads/service.ts` and `features/videos/service.ts`. An event that would move the status backwards is ignored and logged.
- Return 200 quickly. Slow follow-up work (e.g. deleting an asset) runs in `waitUntil`.
- Local development: expose the dev server with a tunnel (`ngrok`/`cloudflared`) and register the URL in the Mux dev environment.

### 7.3 Playback
- **Ads:** public playback. The Marketplace uses the Mux thumbnail/animated GIF and the HLS stream. The editor and preview use the **MP4 static rendition**, which gives exact timing.
- **Creator videos:** signed playback. `GET /api/playback-token/:videoId` (owner or admin) returns short-lived (1 h) playback, thumbnail and storyboard tokens signed with the Mux signing key.
- Hidden, removed or deleted content: the token endpoint refuses, and ad URLs are not rendered to non-admins.

## 8. Preview Engine (PRD §8.6)

Details and alternatives: [ADR-0004](../decisions/0004-burst-preview-engine.md). Code: `src/features/preview/`.

### 8.1 Timeline model
```ts
type Burst = { id: string; adId: string; atSec: number; durationSec: number; src: string /* blob: URL */ };
// Sorted by atSec. Composite timeline = video time with each burst inserted at atSec.
// toComposite(videoTime) = videoTime + Σ durationSec of bursts with atSec < videoTime (≤ for atSec = 0 ordering)
// fromComposite(t) → { kind: "video", videoTime } | { kind: "burst", burstIndex, offset }
```
These pure functions live in `features/preview/timeline.ts`. They are the most heavily unit-tested code in the repo, covering boundaries, bursts at 0 and at the end, adjacent bursts, and seeks.

### 8.2 Playback
- **Layer 1:** `<MuxPlayer>` for the creator video (HLS, signed) with native controls hidden.
- **Layer 2:** one `<video>` element for bursts, stacked on top, `object-fit: contain` on black. When the editor opens, every distinct ad in the project has its MP4 fetched into memory (`fetch → Blob → URL.createObjectURL`). Burst clips are at most 2 s, so this is cheap and switching has no network latency.
- **Burst trigger:** `timeupdate` fires only about every 250 ms, which is too coarse. Use `requestVideoFrameCallback` on the main video (falling back to `requestAnimationFrame` polling of `currentTime`). When `nextBurst.atSec - currentTime ≤ one frame`, pause the main video, set `burst.currentTime = 0`, play the burst, show the "Ad" label. On `ended`, hide the layer and resume the main video.
- **Seek:** use `fromComposite` to work out the target. Seeking into a burst seeks the main video to `atSec`, pauses it, and plays the burst from `offset`.
- **Controls:** a custom control bar shows composite time with burst segments highlighted. Keyboard shortcuts follow PRV-02.
- **iOS:** `playsInline` and `muted` handling. The first play needs a user gesture, and the burst element is "unlocked" during that gesture (play/pause once) so later programmatic plays are allowed.
- **Measurement:** in dev builds, `?debugPreview=1` logs the scheduled vs actual start time of each burst, to check G3 (±100 ms).

### 8.3 Phase 2: rendered export
FFmpeg rendering does not fit Vercel functions. The planned path is a job record in Mongo, a worker on a container platform (or a hosted render API) that concatenates segments and uploads the result to Mux, and a webhook back to the app. The project data model already contains everything the worker needs.

## 9. Security

- Session, role and ownership are checked server-side on every mutation (§5). Zod validates every input. Mongoose `strict` mode is on and `sanitizeFilter` is applied to user-driven queries.
- Rate limits (PRD §10) are enforced through `lib/ratelimit.ts`.
- Headers in `next.config.ts`: CSP (allows Mux `stream.mux.com`, `image.mux.com`, `*.mux.com` for upload, and Blob), HSTS, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`.
- Secrets are only read from `src/env.ts` (server schema). Only `NEXT_PUBLIC_*` values reach the client.
- Webhook signature verification. Signed playback for creator videos. Blob upload tokens restrict content type and size.

## 10. Background Jobs

| Job | Trigger | Work |
| --- | --- | --- |
| `cleanup` | Vercel Cron, daily, `/api/cron/cleanup` (Bearer `CRON_SECRET`) | Mark `uploading` docs older than 24 h as failed. Delete Mux assets of deleted, removed or failed content. Delete orphaned Blob images |

## 11. Environments & Deployment

| Environment | Git branch | Vercel | MongoDB | Mux |
| --- | --- | --- | --- | --- |
| Local | any | `vercel env pull` → `.env.local` | Atlas dev DB (or local) | Mux *Development* env |
| Preview | PR branches | Preview deployments | Atlas `staging` DB | Mux *Development* env |
| Staging | `staging` | Branch domain / custom env | Atlas `staging` DB | Mux *Staging* env |
| Production | `main` | Production | Atlas `production` cluster | Mux *Production* env |

Vercel's Git integration deploys the app. GitHub Actions only verifies the code (see [GIT_WORKFLOW.md](GIT_WORKFLOW.md)).

### 11.1 Environment variables
The canonical list is [`.env.example`](../../.env.example), validated at boot by `src/env.ts`. When you add a variable, update `.env.example`, `src/env.ts` and the Vercel project, in the same PR.

## 12. Observability

- Sentry for client and server errors, with release tagging from `VERCEL_GIT_COMMIT_SHA`.
- Structured server logs (`lib/logger.ts`) carrying `requestId`, `userId` and `docId` for the upload and webhook paths.
- Vercel Analytics and Speed Insights to track the LCP target (PRD §12).
