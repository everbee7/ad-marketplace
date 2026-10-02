# API Surface

> Every server entry point: Route Handlers and Server Actions. Auth and validation follow [ARCHITECTURE.md §5–6](ARCHITECTURE.md#5-auth--authorization).
> Adding or changing an entry point? Update this file in the same PR.

Last updated: 2026-10-02

## Conventions

- Route Handlers return JSON. Errors use `{ error: { code, message } }` with the matching HTTP status (400 validation, 401 unauthenticated, 403 forbidden, 404 not found or not visible, 409 conflict, 429 rate limited).
- Server Actions return `ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code; message; fields? } }`.
- Pagination is cursor-based: an opaque base64 cursor encoding the sort key plus `_id`.
- "owner" means the authenticated user owns the target doc. Admins pass every owner check unless noted.

## Route Handlers

| Method | Path | Auth | Rate limit | Purpose | Req → Res | PRD |
| --- | --- | --- | --- | --- | --- | --- |
| * | `/api/auth/[...all]` | n/a | login 5/15 min/email | Better Auth handler | n/a | AUTH-* |
| POST | `/api/uploads` | business (ad) / creator (video) | 20/h/user | Create or patch the doc and a Mux direct upload | `{ kind, targetId?, meta }` → `{ id, uploadUrl }` | AD-01/02/05, VID-01 |
| GET | `/api/uploads/:id` | owner | 120/min/user | Poll processing status | → `{ kind, status, playbackId?, durationSec?, error? }` | AD-01, VID-01 |
| POST | `/api/webhooks/mux` | Mux signature | n/a | Apply Mux events | Mux event → `200` | AD-01, VID-01 |
| GET | `/api/marketplace` | signed-in | 120/min/user | Search, filter and page live ads | `?q&category[]&duration&aspect&sort&cursor` → `{ items: AdCardDTO[], nextCursor }` | MKT-01/02 |
| GET | `/api/playback-token/:videoId` | owner / admin | 60/min/user | Signed Mux tokens | → `{ playback, thumbnail, storyboard, expiresAt }` | VID-01, PRV-01 |
| POST | `/api/blob/upload` | signed-in | 30/h/user | Vercel Blob client-upload handshake (JPG/PNG/WebP, ≤ 5 MB) | Blob protocol | PRF-01, AD-01 |
| GET | `/api/cron/cleanup` | `Bearer CRON_SECRET` | n/a | Daily cleanup | → `{ stats }` | NFR reliability |

## Server Actions

| Feature file | Action | Role | PRD |
| --- | --- | --- | --- |
| `features/profiles/actions.ts` | `completeOnboarding`, `updateProfile` | business / creator | PRF-01/02 |
| `features/ads/actions.ts` | `updateAd`, `resubmitAd`, `unlistAd`, `relistAd`, `deleteAd` | business (owner) | AD-05/06/07 |
| `features/marketplace/actions.ts` | `saveAd`, `unsaveAd` | creator | MKT-04/05 |
| `features/videos/actions.ts` | `renameVideo`, `deleteVideo` | creator (owner) | VID-02 |
| `features/projects/actions.ts` | `createProject`, `updateBursts` (auto-save with `revision`), `saveProject`, `renameProject`, `duplicateProject`, `deleteProject` | creator (owner) | PRJ-* |
| `features/admin/actions.ts` | `approveAd`, `rejectAd`, `removeAd`, `hideVideo`, `unhideVideo` | admin | ADM-02/03 |

Sign-up, verification, login and password reset use the Better Auth client/server API (`lib/auth.ts`, `lib/auth-client.ts`), not custom actions.

## DTOs (in `features/*/schemas.ts`)

- `AdCardDTO`: `{ id, title, businessName, businessLogoUrl, category, durationSec, aspectRatio, thumbnailUrl, previewGifUrl, saved?: boolean }`
- `ProjectEditorDTO`: `{ id, name, revision, status, video: { id, title, playbackId, durationSec, aspectRatio }, bursts: { id, atSec, ad: { id, title, mp4Url, durationSec, aspectRatio, available } }[] }`

Add new DTOs here when they cross the server/client boundary.
