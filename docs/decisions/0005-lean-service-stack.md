# ADR-0005: Lean MVP service stack: Vercel + MongoDB only

- **Status:** Accepted
- **Date:** 2026-10-02
- **Related:** Supersedes ADR-0003. Amends ADR-0002 (email) and ADR-0004 (clip source). PRD AD-01, VID-01, PRV-01, §10, §12

## Context
The first architecture used eight external services: Vercel, MongoDB Atlas, Mux, Vercel Blob, Resend, Upstash, Sentry, plus a webhook tunnel for local development. For an MVP that is too many accounts, bills, secrets and failure points for a non-technical client, and every developer would need all of them just to run the app. The owner asked to keep services to a minimum and build in-house wherever that is reasonable.

## Decision
Production uses **two platforms only: Vercel and MongoDB Atlas**. Everything else is either built into those two or done in our own code.

| Need | Before | Now |
| --- | --- | --- |
| Video upload and storage | Mux | **Vercel Blob** (built into Vercel). The browser uploads directly through client multipart upload |
| Transcoding | Mux | **None.** Accept web-playable codecs only (H.264 / VP8 / VP9 / AV1). The browser checks the codec with `mp4box.js` before upload and rejects HEVC with a clear message |
| Thumbnails and duration | Mux | **Browser**: a hidden `<video>` reads the duration, and a canvas captures a poster frame that is uploaded as JPEG. The server re-checks ad duration by parsing the MP4 header |
| Processing webhooks | Mux webhooks + tunnel | **None.** The client calls `finalizeUpload` after the upload finishes. The cron job cleans up abandoned uploads |
| Playback | Mux HLS + signed tokens | Progressive MP4 from the Blob CDN (range requests). Creator video URLs are unguessable and only rendered for the owner or an admin |
| Email | Resend | **Our own `lib/email.ts`**: `console` transport in development (links printed in the terminal), **SMTP** (nodemailer) in production using any mailbox the client already has |
| Rate limiting | Upstash Redis | **MongoDB**: Better Auth's database rate-limit storage for auth, plus a `rateLimits` collection with a TTL index for app endpoints |
| Error monitoring | Sentry | Next.js `instrumentation.ts` `onRequestError` → structured JSON logs in **Vercel runtime logs** |
| Local development | All of the above | **Zero accounts**: local MongoDB (`mongodb-memory-server` with a persistent `.data/` folder), a `local` storage driver writing to `.data/uploads`, and console email |

## Alternatives considered
| Option | Why not |
| --- | --- |
| Keep Mux | Best video quality and format support, but it adds an account, webhooks, a local tunnel, signing keys and per-minute billing. We can switch to it later behind the storage/playback adapter |
| Store media in MongoDB GridFS | Vercel's ~4.5 MB request body limit means files would have to be chunked through functions. Database storage is more expensive per GB than Blob |
| Self-hosted FFmpeg transcoding | Can't run on Vercel functions. Needs a separate server |
| Upstash for rate limits | Its strength (sub-ms counters) isn't needed at MVP traffic. MongoDB is already there |

## Consequences
- **Format restriction:** videos must be web-playable. iPhone "High Efficiency" (HEVC) clips are rejected, and the message tells the user to export or share as "Most Compatible" or MP4. This is a known UX cost.
- **No adaptive streaming:** a large creator video plays as one progressive file. That is fine on broadband and slower on weak mobile connections. The 2 GB / 15 min limit stays, but recommend ≤ 500 MB in the UI.
- **Weaker privacy for creator videos:** access relies on unguessable URLs rather than signed tokens. URLs never appear in public pages or APIs, and pages are `noindex`. If the client needs stronger privacy, move to private storage or Mux (Phase 2).
- **Simpler status model:** no `processing` state. Uploads go `uploading → pending_review` (ads) or `uploading → ready` (videos).
- **Preview gets simpler:** ads are already MP4 files, so the preview engine preloads them directly (ADR-0004 logic otherwise unchanged).
- **Swap path:** media access goes through `lib/storage.ts` (`blob` | `local` drivers) and `features/uploads`, so moving to Mux or S3 later stays local to those modules.
- Vercel Hobby is for non-commercial use, so production needs a Vercel Pro plan. Blob storage and transfer are billed by usage.
