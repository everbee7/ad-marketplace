# Data Model (MongoDB)

> Source of truth for collections, fields, indexes and invariants. Mongoose models live in `src/models/`, one file per collection, and must match this doc.
> Changing a schema? Update this file in the same PR and call it out in the PR description (see [GIT_WORKFLOW.md](GIT_WORKFLOW.md)).

Last updated: 2026-10-02 (lean stack, ADR-0005)

General rules:
- `timestamps: true` on every app collection (`createdAt`, `updatedAt`).
- Soft delete uses `deletedAt: Date | null`. Default queries exclude soft-deleted docs (a query helper `.active()` does this).
- IDs cross the client boundary as strings. Never expose `_id` objects or `__v`.
- Enumerations and limits come from `src/config/*`, never inline literals.

## Collections owned by Better Auth

`user`, `session`, `account`, `verification`, `rateLimit`. Their shape is managed by Better Auth. App code reads them only through `lib/auth.ts` (including the read-only admin helpers `countUsersByRole`, `searchUsers`, `usersByIds`).
Extra user fields we add:

| Field | Type | Notes |
| --- | --- | --- |
| `role` | `business \| creator \| admin` | Set once at sign-up. Admins only via the seed script |
| `onboardingCompleted` | boolean | Gate for role areas (PRF-01) |

## `profiles`

One per user (business or creator).

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → user | unique |
| `role` | `business \| creator` | Copied from user for queries |
| `business` | `{ companyName, logoUrl, website, category, description }` \| null | Required when role = business |
| `creator` | `{ displayName, avatarUrl, niche, bio, socialLinks: { youtube, tiktok, instagram, other } }` \| null | Required when role = creator. `niche` uses the category list below (default until the client says otherwise) |

Indexes: `{ userId: 1 } unique`, text index on `business.companyName` (Marketplace search joins through `ads.businessName`, see below).

## `ads`

| Field | Type | Notes |
| --- | --- | --- |
| `businessId` | ObjectId → user | |
| `businessName` / `businessLogoUrl` | string / string | null | Denormalised from the profile for search and cards. Updated on profile edit (`syncBusinessIdentity`) |
| `title` | string | 3–100 |
| `description` | string | null | ≤ 1000 |
| `category` | enum (categories) | |
| `tags` | string[] | ≤ 10, each ≤ 30, lowercased, deduped |
| `status` | `uploading | failed | pending_review | live | unlisted | rejected | removed` | Transitions only via `features/ads/service.ts` (table in `features/ads/lifecycle.ts`) |
| `inMarketplace` | boolean | **Visibility flag** ([ADR-0006](../decisions/0006-ad-versioning.md)): `live`, or `pending_review` with an approved video still active. Recomputed on every transition. Marketplace, placement and project availability use it |
| `rejectionReason` / `removalReason` | string | null | |
| `errorMessage` | string | null | Why the last upload failed (AD-02 AC1) |
| `video` | `VideoAsset` | null | Currently active (approved, or first upload under review) |
| `pendingVideo` | `VideoAsset` | null | Replacement under review while `video` stays live (AD-05 AC2, ADR-0006) |
| `pendingUpload` | `{ videoPath, posterPath, startedAt }` | null | Pathnames reserved by `startAdUpload`; the only paths the upload routes accept |
| `customThumbnailUrl` | string | null | Optional business-chosen cover. Overrides the auto poster |
| `saveCount` / `projectCount` | number | Denormalised counters, updated in the same operation as the source write |
| `statusHistory` | `{ status, at, reason }[]` | Appended by every transition (AD-04) |
| `submittedAt` / `approvedAt` / `removedAt` / `deletedAt` | Date | null | |

`VideoAsset` = `{ url, pathname, posterUrl, posterPathname, sizeBytes, contentType, codec, durationSec, width, height, aspectRatio, errorMessage }`
- `url`/`posterUrl` come from `lib/storage.ts` (Blob, or `/api/dev-files/...` locally). `pathname` is kept so the storage object can be deleted.
- `durationSec`/`codec` for ads are server-verified (mp4box). For creator videos they are client-reported and range-checked.
- `aspectRatio`: `horizontal` (w/h > 1.1), `vertical` (< 0.9), else `square`.

Indexes:
- `{ inMarketplace: 1, createdAt: -1, _id: -1 }`: Marketplace newest (cursor)
- `{ inMarketplace: 1, category: 1, createdAt: -1 }`: filtered listing
- `{ inMarketplace: 1, saveCount: -1, _id: -1 }`, `{ inMarketplace: 1, projectCount: -1, _id: -1 }`: sorts
- `{ businessId: 1, createdAt: -1 }`: business dashboard
- `{ status: 1, submittedAt: 1 }`: admin review queue (oldest first)
- `{ status: 1, updatedAt: 1 }`: cron cleanup of stale `uploading` and deleted docs
- Text (`ad_text`): `{ title, description, tags, businessName }` with weights 5/1/3/2. Upgrade path is Atlas Search

## `creatorVideos`

| Field | Type | Notes |
| --- | --- | --- |
| `creatorId` | ObjectId → user | |
| `title` | string | 3–100 |
| `description` | string | ≤ 1000 |
| `status` | `uploading \| ready \| failed` | `failed → uploading` on retry (VID-01 AC2) |
| `errorMessage` | string \| null | Why the last upload failed |
| `pendingUpload` | `{ videoPath, posterPath, startedAt, meta: { durationSec, width, height, codec } }` \| null | Reserved paths + client-reported facts (videos up to 2 GB are not re-read on the server; size and type are checked with `head()`) |
| `video` | `VideoAsset` | URL is unguessable. Only rendered for the owner and admins |
| `hiddenByAdmin` | boolean | |
| `deletedAt` | Date \| null | |

Indexes: `{ creatorId: 1, createdAt: -1 }`, `{ status: 1, updatedAt: 1 }`, text `{ title }` (admin search).

Deleting a video soft-deletes its projects and decrements each placed ad's `projectCount` in one transaction (VID-02 AC1).

## `savedAds`

| Field | Type |
| --- | --- |
| `creatorId` | ObjectId |
| `adId` | ObjectId |

Indexes: `{ creatorId: 1, adId: 1 } unique`, `{ creatorId: 1, createdAt: -1 }`

## `projects`

| Field | Type | Notes |
| --- | --- | --- |
| `creatorId` | ObjectId | |
| `name` | string | Defaults to the video title |
| `creatorVideoId` | ObjectId | |
| `bursts` | `Burst[]` | 0–10 (`limits.maxBurstsPerProject`) |
| `bursts[].id` | string (nanoid) | Stable client key |
| `bursts[].adId` | ObjectId | |
| `bursts[].atSec` | number | 0 ≤ atSec ≤ video duration, rounded to 0.1 |
| `status` | `draft \| saved` | |
| `revision` | number | Incremented on every save. Used for optimistic concurrency between auto-save and other tabs |
| `deletedAt` | Date \| null | |

Invariants (enforced in `features/projects/service.ts` and tested):
- `bursts` are sorted by `atSec`, and adjacent bursts are ≥ `limits.minBurstSpacingSec` apart.
- Every `adId` was in the Marketplace (`inMarketplace`) **when it was placed**. Later status changes do not edit the project; unavailability is computed on read (PRJ-07). Keeping an unavailable burst in place (or moving it) is allowed; placing it anew is not.
- `ads.projectCount` = number of non-deleted projects that use the ad (an ad used twice in one project counts once), kept in sync in the same transaction as create/updateBursts/duplicate/delete and video deletion.

Indexes: `{ creatorId: 1, updatedAt: -1 }`, `{ creatorVideoId: 1 }`, `{ "bursts.adId": 1 }`

## `moderationLogs`

| Field | Type |
| --- | --- |
| `actorId` | ObjectId (admin, or the business for resubmits) |
| `targetType` | `ad \| creatorVideo \| user` |
| `targetId` | ObjectId |
| `action` | `approve \| reject \| remove \| hide \| unhide \| resubmit` |
| `reason` | string \| null |

Index: `{ targetType: 1, targetId: 1, createdAt: -1 }`. Append-only, never updated. Reject reasons are stored as `"<preset>: <note>"` (ADM-02).

## `rateLimits`

Fixed-window counters for `lib/ratelimit.ts` (ADR-0005, replaces Redis).

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | string | `<bucket>:<key>:<windowStartEpoch>`, e.g. `upload:<userId>:1759363200` |
| `count` | number | `$inc` with `upsert` in one `findOneAndUpdate` |
| `expiresAt` | Date | Window end. **TTL index** `{ expiresAt: 1 }, { expireAfterSeconds: 0 }` |

## Reference data (`src/config/categories.ts`)

Food & Drink · Fashion & Beauty · Tech & Apps · Fitness & Health · Travel & Hospitality · Home & Living · Finance · Education · Entertainment · Gaming · Local Business · Other. Pending PRD OQ-7.
