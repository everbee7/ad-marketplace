# API Surface

> Every server entry point: Route Handlers and Server Actions. Auth and validation follow [ARCHITECTURE.md §5–6](ARCHITECTURE.md#5-auth--authorization).
> Adding or changing an entry point? Update this file in the same PR.

Last updated: 2026-10-02 (lean stack, ADR-0005)

## Conventions

- Route Handlers return JSON. Errors use `{ error: { code, message } }` with the matching HTTP status (400 validation, 401 unauthenticated, 403 forbidden, 404 not found or not visible, 409 conflict, 429 rate limited).
- Server Actions return `ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code; message; fields? } }`.
- Pagination is cursor-based: an opaque base64 cursor encoding the sort key plus `_id`.
- "owner" means the authenticated user owns the target doc. Admins pass every owner check unless noted.

## Route Handlers

| Method | Path | Auth | Rate limit | Purpose | Req → Res | PRD |
| --- | --- | --- | --- | --- | --- | --- |
| * | `/api/auth/[...all]` | n/a | Better Auth limiter + login 5/15 min/email | Better Auth handler | n/a | AUTH-* |
| POST | `/api/uploads/token` | owner of the pending doc (videos) / signed-in (profile images) | 60/h/user | Vercel Blob client-upload handshake. Path, content type and size are restricted per kind | Blob protocol | AD-01, VID-01, PRF-01 |
| GET | `/api/marketplace` | signed-in | 120/min/user | Search, filter and page live ads | `?q&category[]&duration&aspect&sort&cursor` → `{ items: AdCardDTO[], nextCursor }` | MKT-01/02 |
| GET | `/api/cron/cleanup` | `Bearer CRON_SECRET` | n/a | Daily cleanup | → `{ stats }` | NFR reliability |
| PUT/GET | `/api/dev-files/[...path]` | signed-in, **development only** | n/a | Local storage driver: write and serve files in `.data/uploads` | raw bytes | n/a |

## Server Actions

| Feature file | Action | Role | Rate limit | PRD |
| --- | --- | --- | --- | --- |
| `features/uploads/actions.ts` | `startUpload`, `finalizeUpload`, `cancelUpload` | business (ad) / creator (video), owner | upload 20/h/user | AD-01/02/05, VID-01 |
| `features/profiles/actions.ts` | `completeOnboarding`, `updateProfile` | business / creator | n/a | PRF-01/02 |
| `features/ads/actions.ts` | `updateAd`, `resubmitAd`, `unlistAd`, `relistAd`, `deleteAd` | business (owner) | n/a | AD-05/06/07 |
| `features/marketplace/actions.ts` | `saveAd`, `unsaveAd` | creator | 120/min/user | MKT-04/05 |
| `features/videos/actions.ts` | `renameVideo`, `deleteVideo` | creator (owner) | n/a | VID-02 |
| `features/projects/actions.ts` | `createProject`, `updateBursts` (auto-save with `revision`), `saveProject`, `renameProject`, `duplicateProject`, `deleteProject` | creator (owner) | n/a | PRJ-* |
| `features/admin/actions.ts` | `approveAd`, `rejectAd`, `removeAd`, `hideVideo`, `unhideVideo` | admin | n/a | ADM-02/03 |
| `features/errors/actions.ts` | `reportClientError` | any (incl. anonymous) | 30/min/IP | NFR observability |

Sign-up, verification, login and password reset use the Better Auth client/server API (`lib/auth.ts`, `lib/auth-client.ts`), not custom actions.

## DTOs (in `features/*/schemas.ts`)

- `AdCardDTO`: `{ id, title, businessName, businessLogoUrl, category, durationSec, aspectRatio, posterUrl, videoUrl, saved?: boolean }`
- `ProjectEditorDTO`: `{ id, name, revision, status, video: { id, title, url, posterUrl, durationSec, aspectRatio }, bursts: { id, atSec, ad: { id, title, url, durationSec, aspectRatio, available } }[] }`
- `UploadStartDTO`: `{ id, videoPath, posterPath }`

Add new DTOs here when they cross the server/client boundary.
