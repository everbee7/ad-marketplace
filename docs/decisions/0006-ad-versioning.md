# ADR-0006: Keep the approved ad video live while a replacement is reviewed

- **Status:** Accepted
- **Date:** 2026-10-02
- **Related:** PRD AD-05 AC2, AD-06, MKT-01, PRJ-07, §9.1; DATA_MODEL `ads`

## Context
PRD AD-05 AC2: replacing the video on a `live` ad sends it back to review, but "the old version stays visible in the Marketplace until the new one is approved". The PRD note asks us to choose between real version handling and the fallback (hide the ad during review), and to record the choice.

At the same time §9.1 says only `live` ads appear in the Marketplace, and the business must see *In review* while the new video waits.

## Decision
- An ad holds two assets: `video` (the approved one) and `pendingVideo` (a replacement waiting for review).
- Replacing the video on a `live` ad sets `status: "pending_review"` and `pendingVideo`, and keeps `video` untouched.
- A denormalised boolean **`inMarketplace`** decides visibility, kept in sync by every transition in `features/ads/service.ts`:
  - `live` → `true`
  - `pending_review` **with an approved video** (`approvedAt` set and `pendingVideo` present) → `true` (the old version keeps playing)
  - everything else, and any soft-deleted ad → `false`
- Marketplace queries, "can be placed" checks and project availability (PRJ-07) all use `inMarketplace`, never `status` directly.
- **Approve** promotes `pendingVideo` to `video` (the old objects are deleted). **Reject** sets `rejected` and hides the ad (`inMarketplace: false`), keeping both assets so the business can see what was rejected, edit and resubmit (AD-05 AC3).
- If the replacement upload itself is invalid (wrong codec or duration), the live ad is left as it was and only the upload fails.

## Alternatives considered
| Option | Pros | Cons | Why not |
| --- | --- | --- | --- |
| Hide the ad during review (PRD fallback) | Simplest | Creator projects lose the burst for up to a review cycle; contradicts AC2 | AC2 is achievable cheaply |
| Separate `adVersions` collection | Full history | Joins on every Marketplace read, more code | Only one pending version is ever needed |
| Keep `status: "live"` and flag the pending video | No special visibility rule | Business wouldn't see *In review*; breaks §9.1 status table | Conflicts with the PRD |

## Consequences
- Marketplace indexes key on `inMarketplace` instead of `status` (DATA_MODEL updated).
- Any new transition must set `inMarketplace` through the service helper; unit tests cover the table above.
- Reversal: drop `inMarketplace` and filter by `status: "live"`; replacements would then hide the ad during review.
