# Data Model (MongoDB)

> Source of truth for collections, fields, indexes and invariants. Mongoose models live in `src/models/`, one file per collection, and must match this doc.
> Changing a schema? Update this file in the same PR and call it out in the PR description (see [GIT_WORKFLOW.md](GIT_WORKFLOW.md)).

Last updated: 2026-10-02

General rules:
- `timestamps: true` on every app collection (`createdAt`, `updatedAt`).
- Soft delete uses `deletedAt: Date | null`. Default queries exclude soft-deleted docs (a query helper `.active()` does this).
- IDs cross the client boundary as strings. Never expose `_id` objects or `__v`.
- Enumerations and limits come from `src/config/*`, never inline literals.

## Collections owned by Better Auth

`user`, `session`, `account`, `verification`. Their shape is managed by Better Auth. App code reads them only through `lib/auth.ts`.
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
| `creator` | `{ displayName, avatarUrl, niche, bio, socialLinks: { youtube, tiktok, instagram, other } }` \| null | Required when role = creator |

Indexes: `{ userId: 1 } unique`, text index on `business.companyName` (Marketplace search joins through `ads.businessName`, see below).

## `ads`

| Field | Type | Notes |
| --- | --- | --- |
| `businessId` | ObjectId → user | |
| `businessName` | string | Denormalised from the profile for search and cards. Updated on profile edit |
| `title` | string | 3–100 |
| `description` | string | ≤ 1000 |
| `category` | enum (categories) | |
| `tags` | string[] | ≤ 10, each ≤ 30, lowercased, deduped |
| `status` | `uploading \| processing \| failed \| pending_review \| live \| unlisted \| rejected \| removed` | Transitions only via `features/ads/service.ts` |
| `rejectionReason` / `removalReason` | string \| null | |
| `video` | `VideoAsset` (below) | Currently active asset |
| `pendingVideo` | `VideoAsset` \| null | New video under review while the old one stays live (PRD AD-05 AC2) |
| `customThumbnailUrl` | string \| null | Blob URL. Overrides the Mux thumbnail |
| `saveCount` / `projectCount` | number | Denormalised counters, updated in the same operation as the source write |
| `submittedAt` / `approvedAt` / `removedAt` / `deletedAt` | Date \| null | |

`VideoAsset` = `{ muxUploadId, muxAssetId, playbackId, mp4Url, durationSec, aspectRatio, width, height, errorMessage }`

Indexes:
- `{ status: 1, createdAt: -1, _id: -1 }`: Marketplace newest (cursor)
- `{ status: 1, category: 1, createdAt: -1 }`: filtered listing
- `{ status: 1, saveCount: -1, _id: -1 }`, `{ status: 1, projectCount: -1, _id: -1 }`: sorts
- `{ businessId: 1, createdAt: -1 }`: business dashboard
- `{ "video.muxUploadId": 1 }`, `{ "video.muxAssetId": 1 }`, plus the same on `pendingVideo`: webhook lookup
- Text: `{ title: "text", description: "text", tags: "text", businessName: "text" }`. Upgrade path is Atlas Search

## `creatorVideos`

| Field | Type | Notes |
| --- | --- | --- |
| `creatorId` | ObjectId → user | |
| `title` | string | 3–100 |
| `description` | string | ≤ 1000 |
| `status` | `uploading \| processing \| ready \| failed` | |
| `video` | `VideoAsset` | Signed playback, no `mp4Url` |
| `hiddenByAdmin` | boolean | |
| `deletedAt` | Date \| null | |

Indexes: `{ creatorId: 1, createdAt: -1 }`, `{ "video.muxUploadId": 1 }`, `{ "video.muxAssetId": 1 }`

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
- Every `adId` was `live` **when it was placed**. Later status changes do not edit the project; unavailability is computed on read (PRJ-07).

Indexes: `{ creatorId: 1, updatedAt: -1 }`, `{ creatorVideoId: 1 }`, `{ "bursts.adId": 1 }`

## `moderationLogs`

| Field | Type |
| --- | --- |
| `actorId` | ObjectId (admin, or the business for resubmits) |
| `targetType` | `ad \| creatorVideo \| user` |
| `targetId` | ObjectId |
| `action` | `approve \| reject \| remove \| hide \| unhide \| resubmit` |
| `reason` | string \| null |

Index: `{ targetType: 1, targetId: 1, createdAt: -1 }`. Append-only, never updated.

## Reference data (`src/config/categories.ts`)

Food & Drink · Fashion & Beauty · Tech & Apps · Fitness & Health · Travel & Hospitality · Home & Living · Finance · Education · Entertainment · Gaming · Local Business · Other. Pending PRD OQ-7.
