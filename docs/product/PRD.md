# Flashd: Product Requirements Document (MVP)

| Item | Detail |
| --- | --- |
| Product | Flashd (working name, taken from the prototype URL) |
| Document | Product Requirements Document, MVP (v1.0) |
| Status | **Draft.** Client answers pending. The §15 defaults are **in effect provisionally** (A7) |
| Last updated | 2026-10-02 |
| Source brief | [JOB_DESCRIPTION.md](JOB_DESCRIPTION.md) |
| Visual reference | Bubble prototype: https://flashd-53080.bubbleapps.io/version-test/ |
| Related | [ROADMAP](ROADMAP.md) · [ARCHITECTURE](../engineering/ARCHITECTURE.md) · [DATA_MODEL](../engineering/DATA_MODEL.md) · [API](../engineering/API.md) · [DESIGN](../design/DESIGN.md) · [Decisions](../decisions/README.md) |

> **Scope of this document.** It defines **what** we build and **why**, and how we know it is done (acceptance criteria).
> **How** we build it (stack, schemas, endpoints, algorithms) is in the engineering docs.
> When this document and the engineering docs disagree on behaviour, this document wins. Fix the other doc in the same PR.

---

## 1. Problem & Opportunity

Short-form creators want to earn from brands without long sponsorship reads or production overhead. Small and mid-size businesses want reach on creator content but cannot run creator deals one by one.

**Burst ads** solve both problems. A burst ad is a very short branded clip (0.5–2 s) that a creator cuts into their own video. The viewer sees a quick brand flash, the creator keeps editorial control, and the business gets distribution at scale.

Today there is no shared place where businesses can publish burst ads and creators can find them, place them, and preview the result. Flashd is that place.

## 2. Product Summary

Flashd is a web marketplace with two sides:

- **Businesses** upload burst ads into a shared **Marketplace** (the library).
- **Creators** browse the Marketplace, save ads they like, upload their own videos, place one or more burst ads at chosen moments in a video, **preview** the combined result in the browser, and **save** it as a project.
- **Admins** review ads before they appear in the Marketplace and remove content that breaks the rules.

A visual prototype already exists (Bubble). The MVP turns it into a working product. The prototype is the reference for layout and screens; this PRD is the reference for behaviour.

## 3. Goals, Success Metrics & Non-Goals

### 3.1 MVP goals

| # | Goal | Measured by (launch criterion) |
| --- | --- | --- |
| G1 | A business can go from sign-up to a live ad without help | E2E path 1 + 2 (§13) pass on production |
| G2 | A creator can go from sign-up to a saved, previewable project without help | E2E path 3 passes on production |
| G3 | The preview feels like one continuous video | Each burst starts within ±100 ms of its timestamp and the visible gap at each cut is ≤ 100 ms, on Chrome and Safari (desktop + iOS) |
| G4 | Only approved content reaches the Marketplace | 100% of `live` ads have an `approve` moderation log entry |
| G5 | The platform is production-ready on Vercel | Production deploy, monitoring on, no open P0/P1 bugs |

### 3.2 Product metrics (tracked after launch)

| Metric | Definition | Initial target (first 30 days) |
| --- | --- | --- |
| Business activation | % of business sign-ups with ≥ 1 ad submitted within 7 days | ≥ 50% |
| Creator activation | % of creator sign-ups with ≥ 1 saved project within 7 days | ≥ 30% |
| Marketplace depth | Number of `live` ads | ≥ 50 |
| Ad reuse | Average number of projects per live ad | ≥ 2 |
| Review turnaround | Median time from `pending_review` to decision | ≤ 24 h |
| Upload success rate | Uploads that reach a final good state / uploads started | ≥ 95% |

### 3.3 Non-goals (MVP)

- Payments, billing, payouts, pricing, or contracts
- Business approval of each individual placement
- Overlay ads (logo or banner drawn on top of the video)
- Exporting or downloading a single rendered video file (see OQ-2)
- Publishing to social platforms, messaging, notifications beyond auth emails
- Analytics dashboards for businesses or creators
- Native mobile apps (the web app must still be responsive)
- Localisation (English only)

## 4. Users & Personas

| Role | Persona | Primary job to be done | Key screens |
| --- | --- | --- | --- |
| `business` | Marketing lead at a small or mid-size brand | "Get my brand into lots of creator videos with little effort." | Ad upload, My ads, Ad detail |
| `creator` | Short-form video creator (TikTok / Reels / Shorts) | "Find ads that fit my content and see exactly how my video looks with them." | Marketplace, Saved, My videos, Project editor |
| `admin` | Flashd operator | "Keep the Marketplace safe and on-brand." | Review queue, Content tables, Users |

Rules:
- Each account has **exactly one role**, chosen at sign-up (business or creator). Admins are created by a seed script.
- Users cannot change their own role in the MVP.

## 5. Key Concepts (Glossary)

| Term | Meaning |
| --- | --- |
| **Burst ad** (Ad) | A business-owned video clip **0.5–2.0 s** long, published to the Marketplace after admin approval. |
| **Marketplace** | The shared, searchable library of all `live` burst ads. Called "Library" in some prototype screens. |
| **Saved ads** | A creator's personal shortlist of Marketplace ads. |
| **Creator video** | A video a creator uploads (private to that creator and admins). |
| **Project** | One creator video plus one or more burst placements, saved for later editing and preview. |
| **Placement** (burst slot) | One ad inserted at one timestamp of the creator video. Inserting means the creator video **pauses**, the ad plays in full, and the creator video **resumes**. |
| **Preview** | In-browser playback of a project as one continuous video with a single timeline. |
| **Composite duration** | Creator video duration plus the durations of all placed bursts. |

## 6. User Journeys

**J1. Business publishes an ad**
Sign up as business → verify email → complete company profile → upload burst ad → status shows *In review* → admin approves → status is *Live* and the ad appears in the Marketplace.

**J2. Creator builds a project**
Sign up as creator → verify email → complete creator profile → browse or search the Marketplace → save ads → upload a video → create a project → add bursts on the timeline → preview → save → reopen later and edit.

**J3. Admin moderates**
Open the review queue → watch the ad → approve, or reject with a reason → the business sees the result, edits the ad, and resubmits if it was rejected.

**J4. Ad becomes unavailable**
Business unlists or deletes an ad, or an admin removes it → creator projects that use it show the affected bursts as *Unavailable* → the creator swaps or removes those bursts before previewing.

## 7. Scope Overview

Priority uses MoSCoW: **M** = Must (launch blocker), **S** = Should (in MVP if on schedule), **C** = Could (only if time remains).

| Module | ID prefix | Summary | Priority |
| --- | --- | --- | --- |
| Accounts & onboarding | `AUTH`, `PRF` | Sign-up with role, email verification, login, password reset, profiles | M |
| Business ads | `AD` | Upload, dashboard, edit, unlist, delete | M |
| Marketplace | `MKT` | Browse, search, filter, ad detail, save | M |
| Creator videos | `VID` | Upload, list, rename, delete | M |
| Projects & placement editor | `PRJ` | Create project, place bursts on a timeline, auto-save | M |
| Preview | `PRV` | Continuous composite playback with unified controls | M |
| Admin | `ADM` | Review queue, content moderation, users list | M (ADM-04: S) |

## 8. Functional Requirements

Each requirement has an ID, a priority, and acceptance criteria (AC). IDs are stable: never renumber them. A removed requirement is marked ~~struck through~~ with a note.
Commits, PRs and tests reference these IDs (see [AGENTS.md](../../AGENTS.md)).

### 8.1 Accounts & Onboarding

**AUTH-01 · Sign up with role** (M)
- Fields: email, password, confirm password, role (Business / Creator), accept terms.
- Password rule: at least 8 characters, with at least 1 letter and 1 number.
- AC1: A valid submission creates the account and sends a verification email. The user lands on a "Check your email" page.
- AC2: A duplicate email shows "An account with this email already exists."
- AC3: The role is set on the account and cannot be changed later by the user.

**AUTH-02 · Email verification** (M)
- AC1: The verification link is single-use and valid for 24 h.
- AC2: A valid link marks the email as verified and redirects to onboarding.
- AC3: An expired or used link shows an explanation and a "Resend email" button.

**AUTH-03 · Log in / log out** (M)
- AC1: Unverified users cannot log in. They see "Please verify your email" with a resend option.
- AC2: After login, users are redirected by role: business → `/business`, creator → `/creator`, admin → `/admin`. If a `next` parameter is present and allowed for the role, it is used instead.
- AC3: After 5 failed attempts for the same email within 15 minutes, further attempts are blocked and the user sees a clear message.
- AC4: Logging out ends the session on that device.

**AUTH-04 · Forgot / reset password** (M)
- AC1: Requesting a reset always shows the same confirmation message, whether or not the email exists.
- AC2: The reset link is single-use and valid for 1 h.
- AC3: A successful reset signs the user out of all other sessions.

**AUTH-05 · Route protection** (M)
- AC1: Visiting `/business/*`, `/creator/*` or `/admin/*` without a session redirects to `/login?next=<path>`.
- AC2: A signed-in user who visits another role's area is redirected to their own home.
- AC3: Every server-side mutation re-checks session, role and ownership. Route protection alone is never enough.

**PRF-01 · Onboarding** (M)
- Business fields: company name\*, logo, website, category\*, short description (≤ 300 characters).
- Creator fields: display name\*, avatar, niche\*, bio (≤ 300 characters), social links (YouTube, TikTok, Instagram, other).
- AC1: Users cannot reach their role area until all required fields are saved.
- AC2: Logo and avatar accept JPG, PNG or WebP files up to 5 MB.

**PRF-02 · Edit profile** (M)
- AC1: Users can edit the same fields later from their profile page. Changes appear on Marketplace cards and pages straight away.

### 8.2 Business Ads

**AD-01 · Upload burst ad** (M)
- Form: title\* (3–100 characters), description (≤ 1000), category\*, tags (≤ 10, each ≤ 30 characters), video file\*, optional custom thumbnail.
- Video limits: MP4 or MOV with H.264 video. Duration **0.5–2.0 s**. File size ≤ **50 MB** (see §10).
- AC1: The browser checks file type, video format, size and duration before uploading and shows a specific error for each kind of failure. An unsupported format (e.g. iPhone "High Efficiency" HEVC) shows: "This video format isn't supported. Please export it as MP4 (H.264) and try again."
- AC2: A progress bar shows the upload percentage. The user can cancel.
- AC3: When the upload finishes, the ad is checked automatically and its status becomes *In review* (`pending_review`) without a page reload. There is no separate processing wait.
- AC4: The ad's cover image is taken automatically from the video. The business can replace it with a custom thumbnail.
- AC5: If the verified duration is outside 0.5–2.0 s (± 0.05 s tolerance), the ad moves to *Failed* with the message "Burst ads must be 0.5–2 seconds long."

**AD-02 · Upload failure & retry** (M)
- AC1: A failed ad shows the reason and a "Replace video" action that starts a new upload on the same ad without losing its metadata.

**AD-03 · My ads dashboard** (M)
- Grid or table columns: thumbnail, title, status, category, saves, projects using the ad, created date.
- AC1: The list can be filtered by status. The default sort is newest first.
- AC2: Each status has a distinct visual chip and a tooltip that explains it.

**AD-04 · Ad detail (business view)** (M)
- AC1: Shows the player (looping), metadata, status history, and the rejection reason when there is one.

**AD-05 · Edit ad** (M)
- Editable: title, description, category, tags, thumbnail, video (replace).
- AC1: Editing metadata on a `live` ad keeps it `live`.
- AC2: Replacing the video on a `live` ad sends it back to `pending_review`. The old version stays visible in the Marketplace until the new one is approved.
- AC3: A `rejected` ad can be edited and resubmitted. It then moves to `pending_review`.

> Note on AD-05 AC2: keeping the old version live needs version handling. If that proves too costly, the fallback is to hide the ad while it is under review. Record the choice in an ADR.

**AD-06 · Unlist / relist** (M)
- AC1: `live → unlisted` takes effect immediately.
- AC2: `unlisted → live` happens without a new review, unless the video changed since approval.

**AD-07 · Delete ad** (M)
- AC1: A confirm dialog shows how many projects use the ad.
- AC2: A deleted ad disappears from the dashboard and the Marketplace. Projects that use it show those bursts as *Unavailable* (J4).

### 8.3 Marketplace

**MKT-01 · Browse** (M)
- Card: looping muted preview (on hover on desktop, in view on mobile), thumbnail, title, business name and logo, duration (e.g. "1.2 s"), category.
- AC1: Only `live` ads are listed.
- AC2: The list loads with infinite scroll, 24 ads per page, with no duplicates or gaps while new ads are being added.

**MKT-02 · Search, filter, sort** (M)
- Keyword search over title, description, tags and business name.
- Filters: category (multi-select), duration band (0.5–1.0 s, 1.0–1.5 s, 1.5–2.0 s), aspect ratio (vertical, horizontal, square).
- Sort: newest (default), most saved, most used.
- AC1: All filter state lives in the URL (shareable, and the back button works).
- AC2: The empty state shows "No ads match your filters" with a "Clear filters" action.

**MKT-03 · Ad detail page** (M)
- Shows the player, title, description, tags, duration, aspect ratio, a business profile card, and for creators the **Save** and **Use in project** buttons.
- AC1: An ad that is not `live` returns 404 to everyone except its owner and admins.

**MKT-04 · Save / unsave** (M, creator only)
- AC1: The toggle updates instantly (optimistic) and rolls back with an error message if the request fails.
- AC2: The saved state is consistent across cards, the detail page and the Saved page.

**MKT-05 · Saved ads page** (M)
- AC1: Lists the creator's saved ads, newest saved first.
- AC2: Ads that are no longer live show an *Unavailable* overlay and a "Remove" action.

### 8.4 Creator Videos

**VID-01 · Upload video** (M)
- Form: title\*, description, file\*. MP4, MOV (H.264) or WebM. Duration ≤ **15 min**. File size ≤ **2 GB**, with ≤ 500 MB recommended in the UI (see §10).
- AC1: Same upload experience as AD-01 (pre-checks, progress, cancel, live status).
- AC2: The status goes *Uploading* → *Ready* as soon as the upload finishes, or *Failed* with a retry option.
- AC3: Creator videos are private. They are shown only to the owner and admins, and never listed or linked publicly.

**VID-02 · My videos** (M)
- List: thumbnail, title, duration, status, number of projects. Actions: Rename, Create project, Delete.
- AC1: Deleting a video warns "N projects use this video and will be deleted." Confirming deletes the video and those projects.

### 8.5 Projects & Placement Editor

**PRJ-01 · Create project** (M)
- Entry points: "Create project" on a video, "Use in project" on an ad, or "New project" on the Projects page.
- Flow: choose a video (only *Ready* ones) → the editor opens. If the user started from an ad, that ad is already placed at the 0.0 s position as the first burst.
- AC1: The project name defaults to the video title and can be renamed.

**PRJ-02 · Editor layout** (M)
- Main area: preview player (§8.6). Below it: a **timeline** of the creator video with burst markers. Side panel: the list of bursts (ad thumbnail, title, timestamp, actions) and an "Add burst" button that opens an ad picker (tabs: Saved / Marketplace search).
- AC1: The editor is fully usable on desktop and tablet widths. On phones it offers a simplified layout with the burst list and preview only (no timeline dragging).

**PRJ-03 · Place and adjust bursts** (M)
- A burst is added at the playhead position, or by typing a timestamp (`mm:ss.s`).
- Bursts can be dragged along the timeline, or their timestamp edited. Each can be swapped to another ad or removed.
- Rules (see §10): timestamp between 0.0 s and the video duration (0.0 = before the video starts, end = after it finishes), snapped to 0.1 s. Bursts are at least **1.0 s apart**. A project has at most **10 bursts**.
- AC1: Invalid positions are clamped or rejected with an inline message that says why.
- AC2: When the user hovers or drags on the timeline, a frame thumbnail of the creator video at that time is shown.
- AC3: The timeline shows the total composite duration.

**PRJ-04 · Save** (M)
- AC1: Changes auto-save as a draft 1 s after the last edit. An indicator shows "Saving…" and "Saved · {time}".
- AC2: An explicit "Save project" marks the project as saved (not draft).
- AC3: Leaving the page while a save is in progress or has failed shows a confirm dialog.

**PRJ-05 · Projects list** (M)
- Columns: thumbnail, name, video title, number of bursts, status (draft / saved), updated date. Actions: Open, Rename, Duplicate, Delete.

**PRJ-06 · Reopen** (M)
- AC1: Reopening a project restores the exact video, bursts, ads and timestamps.

**PRJ-07 · Unavailable ads in a project** (M)
- AC1: Bursts whose ad is no longer `live` are marked *Unavailable* in the burst list and on the timeline. A banner explains what happened.
- AC2: Preview skips unavailable bursts and says so. The user can swap or remove them in one click.

### 8.6 Preview

**PRV-01 · Composite playback** (M)
- AC1: The project plays as one continuous video. At each burst timestamp the creator video pauses, the ad plays in full with its sound, and the creator video resumes from the same frame.
- AC2: One progress bar covers the composite duration. Burst segments are highlighted on it, and an "Ad" label shows while a burst plays.
- AC3: A burst starts within **±100 ms** of its timestamp, and the visible gap at each cut is **≤ 100 ms** (G3).
- AC4: Ads with a different aspect ratio are letterboxed inside the creator video frame, never stretched or cropped.

**PRV-02 · Controls** (M)
- Play/pause, seek on the unified timeline, mute/volume, fullscreen. Keyboard: Space (play/pause), ← and → (seek 5 s), M (mute), F (fullscreen).
- AC1: Seeking into a burst plays that burst from the matching offset. Seeking across burst boundaries works in both directions.

**PRV-03 · Preview from the editor** (M)
- AC1: Edits to bursts show up in the preview without a page reload, and the playhead position is kept where possible.

**PRV-04 · Mobile playback** (S)
- AC1: Preview plays inline on iOS Safari 16+ and Android Chrome after the user taps play.

### 8.7 Admin

**ADM-01 · Overview** (M)
- Counts: ads pending review, live ads, users by role, uploads in the last 24 h.

**ADM-02 · Review queue** (M)
- Shows `pending_review` ads, oldest first, with the player, metadata and business info.
- Actions: **Approve** → `live`. **Reject** → `rejected`, with a reason chosen from presets (e.g. Inappropriate, Poor quality, Misleading, Wrong length, Other) plus optional free text.
- AC1: Every action records who did it, when, and why, in the moderation log.
- AC2: After an action, the queue moves to the next item automatically.

**ADM-03 · Content moderation** (M)
- Ads table: search, filter by status, **Remove** (reason required). Creator videos table: search, **Hide / Unhide**.
- AC1: Removed or hidden content can no longer be played by anyone except admins.

**ADM-04 · Users** (S)
- Search by email, filter by role, view profile and content counts. (Suspending users is Phase 2.)

## 9. Content Lifecycles (product view)

### 9.1 Burst ad

| Status | Shown to business as | In Marketplace | Can be newly placed | Moves to |
| --- | --- | :---: | :---: | --- |
| `uploading` | Uploading… | — | — | `pending_review`, `failed` |
| `failed` | Failed (reason) | — | — | `uploading` (replace video) |
| `pending_review` | In review | — | — | `live`, `rejected` |
| `live` | Live | ✅ | ✅ | `unlisted`, `removed`, `pending_review` (video replaced) |
| `unlisted` | Unlisted | — | — | `live` |
| `rejected` | Rejected (reason) | — | — | `pending_review` (resubmit) |
| `removed` | Removed by admin (reason) | — | — | terminal |

A deleted ad (by its business) is soft-deleted and no longer shown anywhere except admin tables.

### 9.2 Creator video
`uploading → ready`, or `failed` (retry possible). An admin can hide a video at any time.

### 9.3 Project
`draft ⇄ saved`. A project is deleted when its user deletes it or deletes its video.

## 10. Business Rules & Limits

All limits are defined once in code (`src/config/limits.ts`) and must match this table.

| Rule | Value | Notes |
| --- | --- | --- |
| Burst ad duration | 0.5–2.0 s (± 0.05 s) | Pending OQ-3 |
| Burst ad file size | ≤ 50 MB | |
| Creator video duration | ≤ 15 min | Pending OQ-3 |
| Creator video file size | ≤ 2 GB | |
| Accepted video formats | Ads: MP4/MOV with H.264. Creator videos: MP4/MOV (H.264) or WebM | No server-side conversion in the MVP (ADR-0005). HEVC is rejected with a clear message |
| Image uploads (logo, avatar, thumbnail) | JPG, PNG, WebP, ≤ 5 MB | |
| Bursts per project | 1–10 | Pending OQ-4 |
| Minimum spacing between bursts | 1.0 s of creator-video time | |
| Timestamp precision | 0.1 s | |
| Marketplace page size | 24 | |
| Login lockout | 5 failures / 15 min / email | |
| Upload rate | 20 uploads / hour / user | |

## 11. Content & Moderation Policy (MVP)

- Every ad is reviewed by an admin before it appears in the Marketplace.
- Creator videos are private, so they are not pre-reviewed, but admins can hide them (OQ-5).
- Any `live` ad may be used by any creator, with no per-placement approval from the business (OQ-1).
- Terms of service and a content policy page must exist before launch (the text is provided by the client).

## 12. Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Performance | Marketplace first page LCP ≤ 2.5 s on 4G. Read APIs p95 ≤ 500 ms. Editor opens in ≤ 3 s for a 15-minute video on broadband. |
| Preview quality | G3 timing targets on the browser matrix below. |
| Security | Server-side checks of session, role and ownership on every mutation. Input validation on every boundary. Private creator video playback. No secrets in client bundles. Rate limits as in §10. Security headers (CSP, HSTS, frame-ancestors). |
| Privacy | Collect only email and profile data. Users can delete their content. Account deletion is handled on request in the MVP (self-serve is Phase 2). |
| Reliability | Uploads can be retried. Uploads stuck for more than 24 h are marked failed automatically. Video assets of deleted content are cleaned up. |
| Accessibility | WCAG 2.2 AA: keyboard reachable, visible focus, labelled fields, alt text, captions toggle where available, reduced-motion respected for auto-playing card previews. |
| Responsiveness | 360 px and wider. Editor as described in PRJ-02 AC1. |
| Browser support | Last 2 versions of Chrome, Safari, Firefox and Edge. iOS Safari 16+. Android Chrome. |
| Observability | Server and client errors are logged with user and request context in the hosting platform's logs. Upload failures are logged with their reason. |

## 13. Launch Acceptance (E2E critical paths)

These paths must pass on the production deploy (automated where possible):

1. Business: sign up → verify → onboarding → upload ad → sees *In review*.
2. Admin: approve → ad visible in the Marketplace.
3. Creator: sign up → verify → onboarding → search → save ad → upload video → create project → add 3 bursts (start, middle, end) → preview plays all three in order → save → reopen, and the project is identical.
4. Business unlists the ad → the creator's project shows the burst as *Unavailable*.
5. Admin rejects with a reason → the business sees the reason → edits → resubmits → the ad is back in the queue.
6. Role guard: a creator cannot open `/business/*` or `/admin/*`, and vice versa.

## 14. Assumptions

- A1. The prototype is the layout reference. Visual style will be defined in [DESIGN.md](../design/DESIGN.md) before UI build starts.
- A2. "Burst ads .05–2 seconds" in the brief means **0.5–2 seconds** (OQ-3).
- A3. Bursts are **inserted** (the creator video pauses), not overlaid.
- A4. Preview is in-browser only. No exported file in the MVP (OQ-2).
- A5. The product runs on **two platforms only**: Vercel (hosting, file storage, scheduled jobs) and MongoDB Atlas (database). Production email uses an SMTP mailbox the client already owns. All accounts are owned by the client, who pays usage costs (ADR-0005).
- A7. Until the client answers [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md), every "our suggestion" in it and every default in §15 is treated as decided. Answers that differ are recorded in the ROADMAP decision log and trigger a PRD version bump and re-estimate.
- A6. English only. Times are shown in the viewer's browser time zone.

## 15. Open Questions

The full client-facing questionnaire, in non-technical wording, is [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md). Answers are logged in [ROADMAP.md § Decision log](ROADMAP.md#decision-log-client-answers), then folded into this PRD with a version bump. The table below lists the questions that block engineering.

| ID | Question | Client Q | Default if unanswered | Impact | Needed by |
| --- | --- | --- | --- | --- | --- |
| OQ-1 | Does a business need to approve each use of its ad? | E1 | No, any live ad is usable | Adds request/approve flow | M2 |
| OQ-2 | Is in-browser preview enough for launch, or is a downloadable MP4 required? | D1 | Preview only. Download in Phase 2 | Adds a render worker outside Vercel (+1–2 weeks) | Kickoff |
| OQ-3 | Confirm limits: ads 0.5–2 s / 50 MB, creator videos ≤ 15 min / 2 GB | B1, A5 | As in §10 | Validation and cost | M2 |
| OQ-4 | Maximum bursts per video, and minimum spacing? | C2 | 10 bursts, 1.0 s apart | Editor UX | M5 |
| OQ-5 | Should creator videos be reviewed by an admin? | I3 | No, hide-only moderation | Adds queue type | M4 |
| OQ-6 | Can logged-out visitors browse the Marketplace? | H1 | No, login required | SEO and landing design | M3 |
| OQ-7 | Final category list | H4 | List in DATA_MODEL.md | Filters and data | M2 |
| OQ-8 | Final product name and domain | J3 | "Flashd" | Branding and emails | Before launch |
| OQ-9 | Cut-in vs on-top ad display | C1 | Cut-in (§5 Placement) | Preview engine design | Kickoff |
| OQ-10 | Who chooses burst positions (creator / auto / business)? | C3 | Creator, on a timeline | Editor scope | M5 |
| OQ-11 | Future money flow (who pays whom) | F1 | None in MVP. Keep the data model neutral | Data model and roles | M1 |
| OQ-12 | Is the prototype layout final? | J1, C8 | Layout reference only | Design and scope | Design step |

## 16. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Precise burst timing on Safari/iOS | Preview feels jumpy (G3 missed) | Preload all burst clips as MP4 in memory. Use frame-accurate timing APIs. Test on iOS from M6 day 1 (see ARCHITECTURE §Preview) |
| Client expects a downloadable file | Timeline overrun | Resolve OQ-2 at kickoff |
| Storage and bandwidth costs | Budget | Clean up assets, cap uploads, recommend ≤ 500 MB creator videos |
| No server-side video conversion | Some phone videos (HEVC) are rejected, and large videos stream as one file | Clear export instructions in the error. Switching to a video service later stays isolated behind `lib/storage.ts` (ADR-0005) |
| Prototype or scope changes mid-build | Schedule slip | Freeze scope per milestone. Changes go to the backlog with a PRD version bump |
| Slow client feedback | Schedule slip | Fixed demo checkpoints (ROADMAP). 1 business day feedback window |

## 17. Phase 2 Backlog (not in MVP)

Downloadable rendered video · overlay placements · business placement preferences (allowed categories, max bursts) · "where my ad is used" for businesses · email notifications (approved, rejected, ad used) · user suspension · payments and payouts (Stripe Connect) · analytics (views, completion) · fuzzy search and autocomplete · public Marketplace and SEO · self-serve account deletion.

## 18. Change Log

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-10-02 | First draft (`archive/MVP_PRD_v0.md`) |
| 1.0-draft.2 | 2026-10-02 | Lean stack (ADR-0005): no processing state, H.264/WebM only, two platforms. A7: provisional defaults in effect |
| 1.0-draft.1 | 2026-10-02 | Added OQ-9..12 and a mapping to the client questionnaire (CLIENT_QUESTIONS.md) |
| 1.0-draft | 2026-10-02 | Restructured to product-only PRD. Burst-ad model (0.5–2 s, up to 10 inserted bursts per video). Technical design moved to `docs/engineering/`. Added metrics, journeys, priorities and open-question defaults. |
