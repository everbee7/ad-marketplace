# Creator Ad Marketplace: Product Requirements Document (MVP)

| Item | Detail |
| --- | --- |
| Product | Creator Ad Marketplace (working name) |
| Version | 1.0 (MVP) |
| Timeline | 15 working days (3 weeks) |
| Core stack | Next.js (App Router) · Vercel · MongoDB Atlas |
| Status | Draft for development |

---

## 1. Overview

### 1.1 Summary
A web marketplace that connects **businesses** and **content creators**. Businesses upload short video ads to a shared marketplace. Creators browse the marketplace, save ads they like, upload their own videos, and place an ad inside a video (pre-roll, mid-roll or post-roll). They then preview the combined result and save it as a project.

An existing visual prototype defines the layout and screens. This PRD defines the functionality behind them.

### 1.2 Goals
- A business can sign up, upload an ad, and get it approved and listed in the marketplace.
- A creator can sign up, find an ad, upload a video, place the ad, preview the result, and save it.
- An admin can review ads before they go live and remove any content that breaks the rules.
- The MVP is production-ready on Vercel within 3 weeks.

### 1.3 Non-goals (MVP)
- Payments, billing, payouts, or contracts
- Business approval of each placement
- Overlay ads (logo or banner on top of video)
- More than one ad per video
- Server-side rendering of a single downloadable output file
- Messaging, analytics, social publishing, or native mobile apps

---

## 2. User Roles & Permissions

### 2.1 Roles
| Role | Description | How assigned |
| --- | --- | --- |
| `business` | Brand or company that uploads video ads | Chosen at sign-up |
| `creator` | Video maker who places ads into own videos | Chosen at sign-up |
| `admin` | Platform operator who moderates content | Set manually in DB / seed script |

Each account has **exactly one role**. Role cannot be changed by the user in the MVP.

### 2.2 Permission Matrix
| Action | Business | Creator | Admin |
| --- | :---: | :---: | :---: |
| Sign up / log in / edit own profile | ✅ | ✅ | ✅ |
| Upload ad | ✅ | — | — |
| Edit / unlist / relist / delete own ad | ✅ | — | — |
| View own ads in any status | ✅ | — | ✅ (all) |
| Browse marketplace (Live ads only) | ✅ | ✅ | ✅ |
| Save / unsave ad | — | ✅ | — |
| Upload / rename / delete own video | — | ✅ | — |
| Create / edit / delete project (placement) | — | ✅ | — |
| Preview project | — | ✅ (own) | ✅ |
| Approve / reject ads | — | — | ✅ |
| Hide / remove any ad or video | — | — | ✅ |
| Suspend user | — | — | Phase 2 |

---

## 3. Technical Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js** (App Router, TypeScript) | Server Components, Server Actions, Route Handlers |
| Hosting | **Vercel** | Preview deploy per PR, production on `main` |
| Database | **MongoDB Atlas** | Accessed through **Mongoose** |
| Auth | **Auth.js (NextAuth)** | Credentials provider (email + password), JWT sessions with `role` claim |
| Password hashing | `bcrypt` | Cost factor 12 |
| Video upload / processing / playback | **Mux Video** | Direct browser uploads, transcoding, HLS streaming, thumbnails, webhooks |
| Video player | `@mux/mux-player-react` | Wrapped in a custom preview controller (section 9) |
| Image storage (logos, avatars) | **Vercel Blob** | Client uploads, public URLs |
| Email | **Resend** (+ React Email templates) | Verification and password reset |
| UI | **Tailwind CSS** + **shadcn/ui** | Match prototype styles |
| Forms & validation | **React Hook Form** + **Zod** | Same Zod schemas used on server |
| Data fetching (client) | **TanStack Query** | Marketplace infinite scroll, polling processing status |
| Rate limiting | **Upstash Redis** + `@upstash/ratelimit` | Auth and upload endpoints |
| Error monitoring | **Sentry** | Client + server |
| Testing | **Vitest** (unit), **Playwright** (E2E) | |
| Code quality | ESLint, Prettier, Husky + lint-staged | |
| CI | GitHub Actions + Vercel | Lint, type-check, test on PR |

### 3.1 Why Mux for video
Vercel serverless functions cannot accept large request bodies (about 4.5 MB). Video files must therefore **never pass through the Next.js server**. Mux gives:
- **Direct uploads:** the browser uploads straight to Mux using a one-time URL created by our API
- **Transcoding** to adaptive HLS, so playback works on all devices
- **Thumbnails and duration** metadata, ready to use
- **Webhooks** that tell our app when processing finishes or fails
- **Signed playback** for private creator videos

Fallback if Mux is rejected: Cloudflare Stream (same pattern: direct upload, webhook, HLS).

---

## 4. System Architecture

```
┌────────────────────┐        ┌───────────────────────────────┐
│      Browser       │        │        Vercel (Next.js)        │
│  React / mux-player│◄──────►│ Server Components / Actions    │
│                    │        │ Route Handlers (/api/*)        │
└───────┬────────────┘        │ Auth.js middleware (roles)     │
        │                     └──────┬───────────────┬────────┘
        │ direct video upload        │               │
        ▼                            ▼               ▼
┌────────────────────┐        ┌──────────────┐  ┌────────────┐
│        Mux         │──────► │ MongoDB Atlas│  │ Vercel Blob│
│ upload · transcode │webhook │  (Mongoose)  │  │ logos/avat.│
│ HLS playback       │        └──────────────┘  └────────────┘
└────────────────────┘                 ▲
                                       │
                               ┌───────┴──────┐
                               │ Resend email │
                               └──────────────┘
```

### 4.1 Video Upload Sequence
```
1. User fills ad/video form → clicks Upload
2. Browser → POST /api/uploads { kind, metadata }
3. Server: validate session + role + metadata (Zod)
          create DB doc  { status: "uploading" }
          create Mux direct upload (passthrough = doc _id,
          playback_policy = public for ads / signed for creator videos)
          save muxUploadId on doc
          return { id, uploadUrl }
4. Browser uploads file directly to uploadUrl (UpChunk / mux-uploader, shows progress)
5. Mux → POST /api/webhooks/mux
     video.upload.asset_created → set muxAssetId, status "processing"
     video.asset.ready          → set playbackId, duration, aspectRatio, thumbnail
                                  ads:   status "pending_review"
                                  video: status "ready"
     video.asset.errored        → status "failed", store error message
6. UI polls GET /api/uploads/:id/status every 3 s until final status
```

### 4.2 Rendering Strategy
| Page type | Strategy |
| --- | --- |
| Marketing / landing | Static |
| Marketplace grid | Server Component first page + client infinite scroll |
| Dashboards | Dynamic Server Components (per-user) |
| Placement editor / preview | Client Components |
| Mutations | Server Actions (forms) and Route Handlers (uploads, webhooks, polling) |

---

## 5. Project Structure

```
/app
  /(marketing)/page.tsx
  /(auth)/login, signup, verify-email, forgot-password, reset-password
  /onboarding/page.tsx
  /marketplace/page.tsx
  /marketplace/[adId]/page.tsx
  /business/
      dashboard/page.tsx
      ads/new/page.tsx
      ads/[adId]/page.tsx
      ads/[adId]/edit/page.tsx
      profile/page.tsx
  /creator/
      dashboard/page.tsx
      videos/page.tsx
      videos/new/page.tsx
      saved/page.tsx
      projects/page.tsx
      projects/new/page.tsx
      projects/[projectId]/page.tsx      ← placement editor + preview
      profile/page.tsx
  /admin/
      page.tsx                          ← overview counts
      review/page.tsx                   ← pending ads queue
      ads/page.tsx
      videos/page.tsx
      users/page.tsx
  /api/
      auth/[...nextauth]/route.ts
      uploads/route.ts                  ← POST create direct upload
      uploads/[id]/status/route.ts      ← GET processing status
      webhooks/mux/route.ts             ← POST Mux events
      marketplace/route.ts              ← GET search/filter/paginate
      playback-token/[videoId]/route.ts ← GET signed playback token
      blob/upload/route.ts              ← Vercel Blob client upload token
/components
  /ui            (shadcn)
  /video         (VideoUploader, AdPreviewPlayer, TimelineScrubber)
  /marketplace   (AdCard, AdGrid, Filters)
  /forms
/lib
  db.ts          (cached Mongoose connection)
  auth.ts        (Auth.js config)
  mux.ts         (Mux client + helpers)
  email.ts       (Resend)
  ratelimit.ts
  permissions.ts (requireRole, assertOwner)
  validators/    (Zod schemas shared client + server)
/models          (Mongoose: User, Ad, CreatorVideo, SavedAd, Project, ModerationLog, Token)
/actions         (Server Actions grouped by domain)
/emails          (React Email templates)
/scripts         (seed admin, seed categories)
/tests           (unit + e2e)
middleware.ts    (route protection by role)
```

---

## 6. Data Model (MongoDB)

All documents include `createdAt` and `updatedAt` (Mongoose `timestamps: true`).

### 6.1 `users`
| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `email` | string | unique, lowercase |
| `passwordHash` | string | bcrypt |
| `role` | enum `business \| creator \| admin` | |
| `emailVerifiedAt` | Date \| null | Login allowed only when set |
| `status` | enum `active \| suspended` | `suspended` is used in Phase 2 |
| `onboardingCompleted` | boolean | |
| `business` | object \| null | `{ companyName, logoUrl, website, category, description }` |
| `creator` | object \| null | `{ displayName, avatarUrl, niche, bio, socialLinks: { youtube, tiktok, instagram, other } }` |

Indexes: `{ email: 1 } unique`, `{ role: 1, createdAt: -1 }`

### 6.2 `ads`
| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `businessId` | ObjectId → users | |
| `title` | string | 3–100 chars |
| `description` | string | ≤ 1000 chars |
| `category` | enum (see 6.8) | |
| `tags` | string[] | ≤ 10, each ≤ 30 chars, lowercase |
| `status` | enum (section 7.1) | |
| `rejectionReason` | string \| null | |
| `video` | object | `{ muxUploadId, muxAssetId, playbackId, durationSec, aspectRatio, thumbnailUrl, errorMessage }` |
| `customThumbnailUrl` | string \| null | Optional Blob upload; overrides Mux thumbnail |
| `saveCount` | number | Denormalized counter |
| `projectCount` | number | Denormalized counter |
| `submittedAt` / `approvedAt` / `removedAt` | Date \| null | |
| `deletedAt` | Date \| null | Soft delete |

Indexes:
- `{ status: 1, createdAt: -1 }`: marketplace listing
- `{ status: 1, category: 1, createdAt: -1 }`: filtered listing
- `{ businessId: 1, createdAt: -1 }`: business dashboard
- `{ "video.muxUploadId": 1 }`, `{ "video.muxAssetId": 1 }`: webhook lookup
- Text index `{ title: "text", description: "text", tags: "text" }` (upgrade path: Atlas Search)

### 6.3 `creatorVideos`
| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `creatorId` | ObjectId → users | |
| `title` | string | 3–100 chars |
| `description` | string | ≤ 1000 chars |
| `status` | enum (section 7.2) | |
| `video` | object | Same shape as `ads.video` (signed playback) |
| `hiddenByAdmin` | boolean | |
| `deletedAt` | Date \| null | |

Indexes: `{ creatorId: 1, createdAt: -1 }`, `{ "video.muxUploadId": 1 }`, `{ "video.muxAssetId": 1 }`

### 6.4 `savedAds`
| Field | Type |
| --- | --- |
| `creatorId` | ObjectId |
| `adId` | ObjectId |

Indexes: `{ creatorId: 1, adId: 1 } unique`, `{ creatorId: 1, createdAt: -1 }`

### 6.5 `projects`
| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `creatorId` | ObjectId | |
| `name` | string | Defaults to video title |
| `creatorVideoId` | ObjectId | |
| `placements` | array | MVP: exactly 1 item. Array shape allows multiple ads later |
| `placements[].adId` | ObjectId | |
| `placements[].type` | enum `pre \| mid \| post` | |
| `placements[].atSec` | number \| null | Required when `mid`; rounded to 0.1 s |
| `status` | enum `draft \| saved` | |
| `deletedAt` | Date \| null | |

Indexes: `{ creatorId: 1, updatedAt: -1 }`, `{ "placements.adId": 1 }` (for Phase 2 "where my ad is used")

### 6.6 `moderationLogs`
| Field | Type |
| --- | --- |
| `adminId` | ObjectId |
| `targetType` | enum `ad \| creatorVideo \| user` |
| `targetId` | ObjectId |
| `action` | enum `approve \| reject \| remove \| hide \| unhide` |
| `reason` | string \| null |

Index: `{ targetType: 1, targetId: 1, createdAt: -1 }`

### 6.7 `tokens`
| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId | |
| `type` | enum `email_verify \| password_reset` | |
| `tokenHash` | string | SHA-256 of random token; raw token only in email |
| `expiresAt` | Date | Verify: 24 h · Reset: 1 h |
| `usedAt` | Date \| null | |

Indexes: `{ tokenHash: 1 } unique`, TTL index on `expiresAt`

### 6.8 Reference Data
Categories (config constant, editable later): Food & Drink, Fashion & Beauty, Tech & Apps, Fitness & Health, Travel & Hospitality, Home & Living, Finance, Education, Entertainment, Local Business, Other.

---

## 7. Status Lifecycles

### 7.1 Ad Status
```
uploading ──► processing ──► pending_review ──► live ◄──► unlisted
    │             │               │               │
    ▼             ▼               ▼               ▼
  failed        failed         rejected        removed (admin)
                                  │
                                  └──► pending_review (business edits & resubmits)
```
| Status | Visible in marketplace | Can be placed in new project | Who triggers |
| --- | :---: | :---: | --- |
| `uploading` | — | — | System |
| `processing` | — | — | Mux webhook |
| `failed` | — | — | Mux webhook |
| `pending_review` | — | — | System / business resubmit |
| `live` | ✅ | ✅ | Admin approve / business relist |
| `unlisted` | — | — | Business |
| `rejected` | — | — | Admin (reason required) |
| `removed` | — | — | Admin |

### 7.2 Creator Video Status
`uploading → processing → ready` or `failed`. Admin can set `hiddenByAdmin = true`.

### 7.3 Effect on Existing Projects
- When an ad becomes `unlisted`, `removed`, or is deleted, existing projects keep the reference. The editor shows a banner: *"This ad is no longer available. Choose another ad to keep editing."* Preview is disabled for that project.
- When a creator video is deleted, all its projects are soft-deleted.

---

## 8. Functional Requirements

Format: **ID · Requirement** followed by acceptance criteria (AC).

### 8.1 Authentication & Onboarding (M1)

**AUTH-01 · Sign up with role**
- Fields: email, password, confirm password, role (Business / Creator), terms checkbox.
- Password: ≥ 8 chars, at least 1 letter and 1 number.
- AC: duplicate email shows "An account with this email already exists." A verification email is sent, and the user lands on the "Check your email" page.

**AUTH-02 · Email verification**
- Link `/verify-email?token=…` is valid for 24 h and single-use.
- AC: a valid token sets `emailVerifiedAt` and redirects to `/onboarding`. An expired token shows a "Resend email" button.

**AUTH-03 · Log in / log out**
- AC: unverified users see "Please verify your email" with a resend option. After login, users are redirected by role: business → `/business/dashboard`, creator → `/creator/dashboard`, admin → `/admin`.
- Rate limit: 5 failed attempts per email per 15 min.

**AUTH-04 · Forgot / reset password**
- AC: the request always shows the same message (no email enumeration). The reset link is valid for 1 h and single-use. A successful reset invalidates existing sessions (token version bump).

**AUTH-05 · Onboarding**
- Business: company name*, logo, website, category*, short description.
- Creator: display name*, avatar, niche*, bio, social links.
- AC: users cannot reach their dashboard until required fields are saved.

**AUTH-06 · Route protection**
- `middleware.ts` checks the session and role for `/business/*`, `/creator/*`, `/admin/*`.
- AC: a wrong role redirects to the user's own dashboard. No session redirects to `/login?next=…`.

### 8.2 Business Ad Management (M2)

**AD-01 · Upload ad**
- Form: title*, description, category*, tags, video file*, optional custom thumbnail.
- Allowed formats: MP4, MOV, WebM. Default limits (to confirm): **≤ 500 MB** and **≤ 60 s**.
- Client checks type, size and duration (read via a hidden `<video>` element) before upload.
- AC: a progress bar shows % uploaded, and cancel is possible. After upload, the status chip shows "Processing…" and auto-updates. When processing completes, the status becomes **Pending review**.

**AD-02 · Processing failure**
- AC: the status shows **Failed** with a message and a "Replace video" action that starts a new upload on the same ad.

**AD-03 · My ads dashboard**
- Table/grid: thumbnail, title, status chip, category, saves, projects, created date.
- Filter by status. Default sort: newest.
- AC: each status is shown with a distinct colour and tooltip.

**AD-04 · Ad detail (business view)**
- Player, metadata, status history (from `moderationLogs`), rejection reason if any.

**AD-05 · Edit ad**
- Editable: title, description, category, tags, thumbnail, replace video.
- AC: editing a `live` ad's **video** sends it back to `pending_review`. Editing metadata only keeps it `live`. Editing a `rejected` ad and clicking "Resubmit" sets it to `pending_review`.

**AD-06 · Unlist / relist**
- AC: `live → unlisted` takes effect immediately. `unlisted → live` happens without a new review (unless the video changed).

**AD-07 · Delete ad**
- Soft delete with a confirm dialog. The Mux asset is deleted asynchronously.
- AC: the ad disappears from the dashboard and marketplace. Existing projects show the "no longer available" banner.

### 8.3 Marketplace / Library (M3)

**MKT-01 · Browse**
- Grid of `live` ads: thumbnail (animated GIF preview on hover via Mux), title, business name + logo, duration, category.
- Infinite scroll, 24 per page, cursor-based (`createdAt` + `_id`).

**MKT-02 · Search & filters**
- Keyword search (title, description, tags) using the Mongo text index.
- Filters: category (multi-select), duration (≤ 15 s, 16–30 s, 31–60 s).
- Sort: newest (default), most saved.
- AC: filters are reflected in the URL query string (shareable, back-button safe). Empty state shows "No ads match your filters" with a "Clear filters" link.

**MKT-03 · Ad detail page**
- Player, title, description, tags, duration, business profile card, "Save" button, and a "Use in a project" button (creator only).
- AC: a non-`live` ad returns 404 for non-owners and non-admins.

**MKT-04 · Save / unsave ad (creator)**
- Toggle with optimistic UI. Updates `saveCount`.
- AC: the saved state is reflected on cards and the detail page.

**MKT-05 · Saved ads page**
- `/creator/saved`: grid of saved ads. Ads no longer live show a greyed-out "Unavailable" overlay and a remove action.

### 8.4 Creator Videos (M4)

**VID-01 · Upload video**
- Form: title*, description, file*.
- Default limits (to confirm): **≤ 2 GB** and **≤ 15 min**. Formats: MP4, MOV, WebM.
- Same upload pipeline as ads, with **signed** playback policy.
- AC: status goes Processing → Ready, or Failed with retry.

**VID-02 · My videos**
- List with thumbnail, title, duration, status, number of projects, and actions: Rename, Create project, Delete.
- AC: delete warns "X projects use this video and will be deleted".

### 8.5 Projects & Ad Placement Editor (M5)

**PRJ-01 · Create project**
- Entry points: "Create project" on a video, or "Use in a project" on an ad.
- Step 1: choose a video (Ready only). Step 2: choose an ad (tabs: Saved / Marketplace search). Then open the editor.
- AC: if launched from an ad, that ad is preselected. If launched from a video, that video is preselected.

**PRJ-02 · Placement editor layout**
- Left: preview player (section 9). Right: placement panel.
- Placement panel: radio **Pre-roll / Mid-roll / Post-roll**, a timestamp input (mm:ss.s) for mid-roll, and a "Change ad" button.
- Below the player: **timeline scrubber** showing the creator video as a bar, with the ad as a coloured block at its position.

**PRJ-03 · Mid-roll position**
- The user drags a marker on the timeline or types a timestamp.
- Constraints: `1.0 ≤ atSec ≤ videoDuration − 1.0`.
- Snap to 0.1 s. A thumbnail frame preview is shown at the marker using the Mux thumbnail `?time=` parameter.
- AC: out-of-range input is clamped with an inline message.

**PRJ-04 · Save project**
- Auto-save draft every change (debounced 1 s). An explicit "Save project" sets status `saved`.
- AC: the "Saved ✓" indicator shows the last save time. Leaving with unsaved changes shows a confirm dialog.

**PRJ-05 · Projects list**
- `/creator/projects`: thumbnail, project name, video title, ad title, placement type, updated date. Actions: Open, Rename, Duplicate, Delete.

**PRJ-06 · Reopen and edit**
- AC: opening a saved project restores the exact video, ad, placement and timestamp.

### 8.6 Preview (M6)

**PRV-01 · Combined playback**
- Plays the creator video and ad as one continuous experience according to the placement (section 9).
- AC: a single unified progress bar covers the total duration (video + ad). The ad segment is highlighted, with an "Ad" label while the ad plays.

**PRV-02 · Controls**
- Play/pause, seek on unified timeline, mute, fullscreen, keyboard (space, ←/→ 5 s).
- AC: seeking into the ad segment plays the ad from that offset. Seeking across segment boundaries works in both directions.

**PRV-03 · Smooth transitions**
- AC: the gap between segments is ≤ 300 ms on broadband (next segment preloaded and paused before switch).

### 8.7 Admin (M7)

**ADM-01 · Overview**
- Counts: pending ads, live ads, users by role, videos uploaded today.

**ADM-02 · Review queue**
- List of `pending_review` ads, oldest first. Each shows player, metadata, and business info.
- Actions: **Approve** → `live`, or **Reject** → `rejected` (reason required, chosen from presets plus free text).
- AC: each action writes a `moderationLogs` entry. The queue advances to the next item automatically.

**ADM-03 · Content management**
- Ads table: search, filter by status, and a **Remove** action (reason required).
- Videos table: search, plus a **Hide/Unhide** action.
- AC: removed or hidden content is no longer playable by non-admins.

**ADM-04 · Users table**
- Search by email, filter by role, view profile and content counts. (Suspend is Phase 2.)

---

## 9. Preview Engine (Technical Design)

### 9.1 Segment Model
The project is converted into an ordered list of segments:

```ts
type Segment = {
  source: "video" | "ad";
  playbackId: string;
  token?: string;      // signed playback token for creator video
  start: number;       // seconds within the source
  end: number;         // seconds within the source
};

function buildSegments(video, ad, p): Segment[] {
  switch (p.type) {
    case "pre":  return [seg(ad, 0, ad.dur), seg(video, 0, video.dur)];
    case "post": return [seg(video, 0, video.dur), seg(ad, 0, ad.dur)];
    case "mid":  return [
      seg(video, 0, p.atSec),
      seg(ad, 0, ad.dur),
      seg(video, p.atSec, video.dur),
    ];
  }
}
```

### 9.2 Player Implementation
- **Two stacked player instances** (`<MuxPlayer>`): one for the creator video, one for the ad. Only the active one is visible.
- A `PreviewController` hook keeps `segmentIndex`, a `globalTime` mapping, and handles:
  - `timeupdate` on the active player. When `currentTime >= segment.end`, it pauses and switches to the next segment.
  - Preloading: the next segment's player is loaded and seeked to `segment.start` in advance.
  - Unified seek: maps global time → (segmentIndex, localTime).
- Custom control bar (our own UI); native Mux controls are hidden.
- Mobile: `playsInline`. Autoplay only after a user gesture.

### 9.3 Signed Playback
- Creator videos use a Mux **signed** playback policy.
- `GET /api/playback-token/[videoId]` checks that the requester is the owner or an admin, then returns a short-lived JWT (1 h) signed with the Mux signing key.
- Ads use **public** playback (they are marketplace content).

### 9.4 Phase 2 Path: Downloadable Output
Rendering a single MP4 needs FFmpeg, which does not fit in Vercel functions. Planned approach: a background job queue (for example a worker on a container platform, or a hosted rendering API) reads the project, stitches the segments with FFmpeg, uploads the result to Mux/S3, and notifies by webhook.

---

## 10. API Specification

### 10.1 Route Handlers
| Method | Path | Auth | Purpose | Request | Response |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/uploads` | business / creator | Create DB doc + Mux direct upload | `{ kind: "ad" \| "video", adId?, title, … }` | `{ id, uploadUrl }` |
| GET | `/api/uploads/:id/status` | owner | Poll processing status | — | `{ status, playbackId?, durationSec?, error? }` |
| POST | `/api/webhooks/mux` | Mux signature | Update video state | Mux event | `200` |
| GET | `/api/marketplace` | logged-in | Search & paginate live ads | `?q&category&duration&sort&cursor` | `{ items[], nextCursor }` |
| GET | `/api/playback-token/:videoId` | owner / admin | Signed playback token | — | `{ token, expiresAt }` |
| POST | `/api/blob/upload` | logged-in | Vercel Blob client-upload token (images ≤ 5 MB, jpg/png/webp) | Blob handshake | token |
| * | `/api/auth/[...nextauth]` | — | Auth.js | — | — |

### 10.2 Server Actions
| Domain | Action | Role |
| --- | --- | --- |
| Auth | `signUp`, `resendVerification`, `requestPasswordReset`, `resetPassword` | public |
| Profile | `completeOnboarding`, `updateProfile` | business / creator |
| Ads | `updateAd`, `resubmitAd`, `unlistAd`, `relistAd`, `deleteAd`, `replaceAdVideo` | business (owner) |
| Saved | `saveAd`, `unsaveAd` | creator |
| Videos | `renameVideo`, `deleteVideo` | creator (owner) |
| Projects | `createProject`, `updatePlacement`, `saveProject`, `renameProject`, `duplicateProject`, `deleteProject` | creator (owner) |
| Admin | `approveAd`, `rejectAd`, `removeAd`, `hideVideo`, `unhideVideo` | admin |

Every action follows the same pattern: `auth()` → `requireRole()` → Zod `parse()` → `assertOwner()` → DB write → `revalidatePath()` → typed result `{ ok: true, data } | { ok: false, error }`.

### 10.3 Webhook Handling Rules
- Verify the `mux-signature` header with `MUX_WEBHOOK_SECRET`. Reject invalid signatures with `401`.
- Look up the document by `passthrough` (doc `_id`), falling back to `muxUploadId` / `muxAssetId`.
- **Idempotent:** ignore events that would move a status backwards.
- Respond `200` quickly. Any work beyond a DB update is done after the response with `waitUntil`.

---

## 11. Pages & Navigation

| Route | Role | Content |
| --- | --- | --- |
| `/` | public | Landing, two CTAs: "I'm a business" / "I'm a creator" |
| `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password` | public | Auth |
| `/onboarding` | business / creator | Role-specific profile form |
| `/marketplace`, `/marketplace/[adId]` | logged-in | Browse, search, ad detail |
| `/business/dashboard` | business | My ads + "Upload ad" CTA |
| `/business/ads/new`, `/business/ads/[id]`, `/business/ads/[id]/edit` | business | Ad CRUD |
| `/business/profile` | business | Company profile |
| `/creator/dashboard` | creator | Recent projects, videos, saved ads |
| `/creator/videos`, `/creator/videos/new` | creator | Video library |
| `/creator/saved` | creator | Saved ads |
| `/creator/projects`, `/creator/projects/new`, `/creator/projects/[id]` | creator | Projects + editor |
| `/creator/profile` | creator | Creator profile |
| `/admin`, `/admin/review`, `/admin/ads`, `/admin/videos`, `/admin/users` | admin | Moderation |

Global header: logo, Marketplace, role-specific nav, avatar menu (Profile, Log out).

---

## 12. Non-Functional Requirements

### 12.1 Performance
- Marketplace first page: LCP ≤ 2.5 s on 4G (thumbnails via `next/image`, lazy loading).
- API p95 ≤ 500 ms for reads (excluding Mux).
- Cached MongoDB connection across serverless invocations (global singleton). Atlas connection pool sized for serverless.

### 12.2 Security
- All mutations check session, role and ownership on the server. The client is never trusted.
- Zod validation on every input. Mongoose `strict` mode is on.
- Passwords hashed with bcrypt. Tokens stored only as SHA-256 hashes.
- Rate limits: auth 5/15 min per IP+email, uploads 20/hour per user, marketplace 120/min per user.
- Mux webhook signature verification. Signed playback for private creator videos.
- Secure HTTP headers (CSP, HSTS, X-Frame-Options) set in `next.config`.
- No secrets in the client bundle. Only `NEXT_PUBLIC_*` variables are exposed.

### 12.3 Reliability
- Uploads can be retried after failure. Stuck `uploading` docs older than 24 h are marked `failed` by a daily **Vercel Cron** job (`/api/cron/cleanup`).
- Deleted ads and videos have their Mux assets removed by the same cron job.

### 12.4 Accessibility & UX
- WCAG 2.1 AA target: keyboard navigation, focus states, labelled form fields, alt text on thumbnails.
- Responsive from 360 px to desktop. The editor is optimised for desktop/tablet, with a simplified mobile layout.
- Every async action has loading, success and error states (toast + inline).

### 12.5 Browser Support
Latest 2 versions of Chrome, Safari, Firefox, Edge. iOS Safari 16+.

---

## 13. Environment Variables

```
# App
NEXT_PUBLIC_APP_URL=
AUTH_SECRET=

# MongoDB
MONGODB_URI=

# Mux
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=
MUX_SIGNING_KEY_ID=
MUX_SIGNING_PRIVATE_KEY=     # base64

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Email
RESEND_API_KEY=
EMAIL_FROM=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Monitoring
SENTRY_DSN=
CRON_SECRET=
```

---

## 14. Environments & Deployment

| Environment | Branch | Database | Mux |
| --- | --- | --- | --- |
| Local | any | Atlas dev cluster (or local Mongo) | Mux dev environment |
| Preview | PR branches | Atlas staging DB | Mux dev environment |
| Production | `main` | Atlas production cluster | Mux production environment |

- Mux webhooks are configured per environment (production URL, staging URL). Local development uses a tunnel (e.g. ngrok) for webhooks.
- CI on every PR runs `lint`, `typecheck`, `vitest`, and Playwright smoke tests against the preview URL.
- Seed scripts: `scripts/seed-admin.ts` (creates the admin user), `scripts/seed-demo.ts` (demo ads/videos for client review).

---

## 15. Testing & QA

### 15.1 Unit (Vitest)
- Zod schemas, permission helpers, `buildSegments`, global↔local time mapping, webhook status transitions.

### 15.2 E2E (Playwright), Critical Paths
1. Business: sign up → verify → onboarding → upload ad → sees Pending review.
2. Admin: approve ad → ad appears in marketplace.
3. Creator: sign up → onboarding → search → save ad → upload video → create project (mid-roll) → preview → save → reopen.
4. Business: unlist ad → creator project shows "no longer available".
5. Admin: reject ad with reason → business sees reason → edits → resubmits.
6. Role guard: creator cannot open `/business/*` or `/admin/*`.

### 15.3 Manual QA Checklist
- Uploads on slow network, cancel and retry
- Large file near limit, wrong format, over-length video
- Preview on Chrome, Safari (macOS + iOS), Firefox
- Mid-roll at the very start or end limits
- Email links (expired, reused)

---

## 16. Delivery Plan (15 Working Days)

| Day | Work | Output |
| --- | --- | --- |
| 1 | Repo, Next.js, Tailwind/shadcn, Mongo connection, Vercel envs, Mux + Resend accounts, CI | Deployed skeleton |
| 2 | Auth.js, sign-up/login, email verification, password reset | Auth working |
| 3 | Middleware role guard, onboarding (both roles), profile pages, Blob image upload | Accounts complete |
| 4 | Ad model, `/api/uploads`, Mux direct upload, webhook handler, status polling | Ad uploads processing |
| 5 | Business dashboard, ad detail, edit/unlist/relist/delete, replace video | Ad management complete |
| 6 | Marketplace grid, infinite scroll, ad detail page | Browsing works |
| 7 | Search (text index), filters, sort, save/unsave, Saved page | Marketplace complete |
| 8 | Creator video upload (signed playback), My videos, playback token API | Creator videos complete |
| 9 | Project model, create-project flow (pick video + ad), projects list | Projects CRUD |
| 10 | Placement editor UI, placement panel, timeline scrubber | Editor UI |
| 11 | Preview engine: segments, dual-player controller, unified seek | Combined preview works |
| 12 | Auto-save, reopen, unavailable-ad handling, preview polish | Preview & save complete |
| 13 | Admin overview, review queue, content tables, moderation logs | Admin complete |
| 14 | E2E tests, cross-browser QA, cron cleanup, security headers, rate limits | Release candidate |
| 15 | Bug fixes, client walkthrough, production deploy, handover notes | **Launch** |

Client checkpoints: end of Day 5 (business side demo), Day 10 (marketplace + creator demo), Day 15 (launch).

---

## 17. Phase 2 Backlog
| Feature | Notes |
| --- | --- |
| Overlay placements | Logo/banner over video with position, size, start/end time |
| Multiple ads per video | `placements[]` already supports it |
| Downloadable final video | FFmpeg render worker (section 9.4) |
| "Where my ad is used" | Uses `projects.placements.adId` index |
| Business placement preferences | Allowed types, max ads per video |
| Email notifications | Approved, rejected, ad used |
| User suspension | `users.status` already present |
| Payments & payouts | Stripe Connect |
| Analytics | Views, completion rate (Mux Data) |
| Atlas Search | Fuzzy search, autocomplete |

---

## 18. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Seamless switching between segments is hard on Safari/iOS | Preview feels jumpy | Preload the next player, test on iOS from Day 11, accept ≤ 300 ms gap |
| Client expects a downloadable file in MVP | Timeline overrun | Confirm before kickoff (Q2); otherwise move to Phase 2 |
| Mux costs grow with storage/streaming | Budget | Clean up deleted/failed assets via cron; set upload limits |
| Prototype changes mid-sprint | Schedule slip | Freeze screens at kickoff; changes go to Phase 2 |
| Slow client feedback | Schedule slip | 1-business-day feedback assumption; fixed demo days |

---

## 19. Assumptions
- The prototype is the final design source. No new design work is included.
- Creators can use any `live` ad without per-placement business approval.
- Preview is in-browser only. No exported file in the MVP.
- Third-party accounts (Vercel, MongoDB Atlas, Mux, Resend, Upstash) are created under the client's ownership. Usage costs are paid by the client.
- English only, single time zone display (user's browser).

## 20. Open Questions
1. Does each placement need business approval, or can creators use any live ad?
2. Is in-app preview enough for launch, or is a downloadable final video required?
3. Confirm limits: ad ≤ 60 s / 500 MB, creator video ≤ 15 min / 2 GB?
4. Should creator videos also go through admin review before use, or only ads?
5. Is the marketplace visible to logged-out visitors, or only after login?
6. Final category list?