# ADR-0003: Mux for video upload, processing and playback

- **Status:** Superseded by [ADR-0005](0005-lean-service-stack.md)
- **Date:** 2026-10-02
- **Related:** AD-01, VID-01, PRV-01

## Context
Users upload videos up to 2 GB in arbitrary formats and codecs. Vercel functions cannot accept large bodies or run FFmpeg. We need transcoding, thumbnails, duration metadata, private playback for creator videos, and precise playback of very short (0.5–2 s) ads.

## Decision
Use **Mux Video**:
- Direct browser uploads (UpChunk) using a one-time URL that our API creates.
- Webhooks drive the status changes (`asset_created`, `asset.ready`, static rendition ready, `errored`).
- Ads: public playback, plus an **MP4 static rendition** used by the editor and preview for exact timing.
- Creator videos: **signed** playback with short-lived JWTs.
- `video_quality: basic` to keep costs down.

## Alternatives considered
| Option | Why not |
| --- | --- |
| Cloudflare Stream | A viable fallback with the same pattern. Mux has better React player and upload components, and static MP4 renditions |
| Vercel Blob / S3 + raw files | No transcoding: iPhone HEVC/MOV files would not play everywhere, and there would be no thumbnails |
| Self-hosted FFmpeg worker | Too much infrastructure for the MVP |

## Consequences
- Webhook handling must be idempotent and monotonic.
- Costs scale with stored and streamed minutes. The cleanup cron deletes unused assets.
- Local development needs a tunnel to receive webhooks.
