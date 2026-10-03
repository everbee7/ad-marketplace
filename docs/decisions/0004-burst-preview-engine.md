# ADR-0004: Client-side burst preview with preloaded MP4 clips

- **Status:** Accepted. Clip source amended by [ADR-0005](0005-lean-service-stack.md) (MP4 files from Blob instead of Mux renditions; plain `<video>` instead of Mux Player)
- **Date:** 2026-10-02
- **Related:** PRV-01..04, PRJ-03, PRD G3

## Context
Burst ads last 0.5–2 s. The first draft planned two stacked HLS players switched on `timeupdate`, with a ≤ 300 ms gap budget. That budget is 15–60% of a burst, which is unacceptable. `timeupdate` also fires only about every 250 ms, so a burst could start up to a quarter-second late. PRD G3 sets ±100 ms start accuracy and a ≤ 100 ms gap. No rendered output is required for the MVP (PRD A4).

## Decision
- The creator video plays in Mux Player (HLS, signed).
- Every distinct ad in the project is fetched as its **MP4 static rendition** into memory (`Blob` → object URL) when the editor opens. One overlaid `<video>` element plays bursts with `object-fit: contain`.
- Bursts are triggered with `requestVideoFrameCallback` (falling back to `requestAnimationFrame` polling), which pauses the main video, plays the burst and resumes on `ended`.
- Pure timeline mapping functions (`toComposite` / `fromComposite`) drive the unified progress bar and seeking.

## Alternatives considered
| Option | Why not |
| --- | --- |
| Two HLS players + `timeupdate` | Too coarse, and HLS start-up latency per switch |
| Media Source Extensions splice | Precise, but complex (codec and timestamp alignment), and iOS Safari MSE support is limited (ManagedMediaSource only) |
| Server-rendered composite (FFmpeg) | Needs a worker outside Vercel and adds latency for every edit. Planned for Phase 2 export only |

## Consequences
- iOS needs a user-gesture "unlock" of the burst element on the first play.
- Pausing the main HLS stream can cause a small rebuffer on resume. The fallback is to keep the main video `muted` and paused while the burst plays, and to measure with `?debugPreview=1`.
- Accuracy must be verified on real Safari/iOS devices early in M6.

## Spike results (2026-10-02, Phase 0 / built into `features/preview`)
Implementation as decided, with two refinements: **one pre-decoded `<video>` per distinct ad** (instead of one shared element, so a cut never waits on a `src` swap) and a pure `engine.ts` class driven by `requestVideoFrameCallback` with an rAF fallback. Measured with `?debugPreview=1` in the Playwright E2E (`tests/e2e/projects.spec.ts`), 10 s H.264 creator video, local storage driver:

| Engine | Trigger | Start offset \|video time − atSec\| | Gap (cut → first ad frame) |
| --- | --- | --- | --- |
| Chromium 14x (headless) | rVFC | 0–34 ms | 8–41 ms |
| Chromium, rVFC removed | rAF fallback | 11–12 ms | 47–84 ms |
| Safari / iOS Safari | — | **not measured yet** | **not measured yet** |

G3 (±100 ms start, ≤ 100 ms gap) holds on both Chromium paths. Playwright WebKit on Windows can't decode H.264, so the WebKit project only runs on macOS (`E2E_WEBKIT=1`). **Open:** a manual check on a real iPhone (iOS 16+) and desktop Safari before Checkpoint B, using `?debugPreview=1` and reading `window.__flashdPreviewLog`. If Safari misses G3, the fallback is the MSE splice from the alternatives table, via a new ADR.
