"use client";

import {
  burstStart,
  compositeDuration,
  fromComposite,
  nextBurstIndex,
  sortBursts,
  type TimelineBurst,
} from "./timeline";

// Composite playback engine (ARCHITECTURE §8.2, ADR-0004). Plain DOM + timing logic, no React.
// Layer 1 is the creator video; layer 2 is one pre-decoded <video> per distinct ad. At each burst
// timestamp the main video pauses on the exact frame, the ad plays in full, then the video resumes.

export type EngineBurst = TimelineBurst & { src: string };

export type EngineState = {
  playing: boolean;
  mode: "video" | "burst";
  burstIndex: number;
  compositeTime: number;
  compositeDuration: number;
  videoTime: number;
  ended: boolean;
};

export type BurstTiming = {
  burstId: string;
  atSec: number;
  /** Main video time when the cut happened; G3 start accuracy = |triggerVideoTime − atSec|. */
  triggerVideoTime: number;
  /** Wall-clock gap between the cut and the first presented ad frame (G3 ≤ 100 ms). */
  gapMs: number | null;
};

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const FRAME = 1 / 30;
const EPS = 1e-3;

declare global {
  interface Window {
    __flashdPreviewLog?: BurstTiming[];
  }
}

export class PreviewEngine {
  private bursts: EngineBurst[] = [];
  private duration = 0;
  private played = new Set<string>();
  private mode: "video" | "burst" = "video";
  private burstIndex = -1;
  private playing = false;
  private ended = false;
  private raf = 0;
  private rvfc = 0;
  private active: HTMLVideoElement | null = null;
  private unlocked = false;
  private disposed = false;
  private readonly listeners: (() => void)[] = [];

  constructor(
    private readonly main: VideoWithRvfc,
    private readonly burstElement: (src: string) => HTMLVideoElement | null,
    private readonly onState: (s: EngineState) => void,
    private readonly debug = false,
  ) {
    const onEnded = () => this.handleMainEnded();
    const onSeeked = () => this.emit();
    main.addEventListener("ended", onEnded);
    main.addEventListener("seeked", onSeeked);
    main.addEventListener("loadedmetadata", onSeeked);
    this.listeners.push(
      () => main.removeEventListener("ended", onEnded),
      () => main.removeEventListener("seeked", onSeeked),
      () => main.removeEventListener("loadedmetadata", onSeeked),
    );
    if (debug && typeof window !== "undefined") window.__flashdPreviewLog = [];
  }

  /** PRV-03 AC1: new bursts apply immediately; the playhead stays on the same video frame. */
  setTimeline(videoDuration: number, bursts: EngineBurst[]) {
    const videoTime = this.main.currentTime;
    const activeId = this.mode === "burst" ? this.bursts[this.burstIndex]?.id : undefined;
    const activeBurst = this.bursts[this.burstIndex];
    this.duration = videoDuration;
    this.bursts = sortBursts(bursts);
    const ids = new Set(this.bursts.map((b) => b.id));
    // Bursts already played stay played; anything before the playhead counts as played.
    const played = new Set([...this.played].filter((id) => ids.has(id)));
    for (const b of this.bursts) if (b.atSec < videoTime - EPS) played.add(b.id);
    this.played = played;
    if (this.mode === "burst") {
      const same = this.bursts.findIndex(
        (b) => b.id === activeId && b.atSec === activeBurst?.atSec && b.src === activeBurst?.src,
      );
      if (same >= 0)
        this.burstIndex = same; // keep playing the unchanged burst
      else this.stopBurst();
    }
    this.emit();
  }

  get state(): EngineState {
    const total = compositeDuration(this.duration, this.bursts);
    let compositeTime: number;
    if (this.mode === "burst" && this.active && this.burstIndex >= 0) {
      compositeTime = burstStart(this.burstIndex, this.bursts) + this.active.currentTime;
    } else {
      compositeTime =
        this.main.currentTime +
        this.bursts.reduce((s, b) => (this.played.has(b.id) ? s + b.durationSec : s), 0);
    }
    return {
      playing: this.playing,
      mode: this.mode,
      burstIndex: this.burstIndex,
      compositeTime: Math.min(compositeTime, total),
      compositeDuration: total,
      videoTime: this.main.currentTime,
      ended: this.ended,
    };
  }

  /** iOS: media elements may only start with sound inside a user gesture, so prime them once. */
  private unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const b of this.bursts) {
      const el = this.burstElement(b.src);
      if (!el) continue;
      const wasMuted = el.muted;
      el.muted = true;
      void el
        .play()
        .then(() => {
          // A burst may already be using this element (e.g. a burst at 0.0 s): leave it playing.
          if (el.dataset.active !== "true") {
            el.pause();
            el.currentTime = 0;
          }
          el.muted = wasMuted;
        })
        .catch(() => {
          el.muted = wasMuted;
        });
    }
  }

  play() {
    this.unlock();
    if (this.ended) this.seekComposite(0);
    this.playing = true;
    this.ended = false;
    if (this.mode === "burst" && this.active) {
      void this.active.play().catch(() => this.pause());
    } else if (!this.checkTrigger(this.main.currentTime)) {
      void this.main.play().catch(() => this.pause());
    }
    this.loop();
    this.emit();
  }

  pause() {
    this.playing = false;
    this.main.pause();
    this.active?.pause();
    this.stopLoop();
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  /** PRV-02 AC1: seeking into a burst plays it from the matching offset, both directions. */
  seekComposite(t: number) {
    const total = compositeDuration(this.duration, this.bursts);
    const target = Math.min(Math.max(0, t), total);
    const pos = fromComposite(target, this.duration, this.bursts);
    if (this.mode === "burst") this.stopBurst();
    this.ended = false;
    if (pos.kind === "video") {
      this.played = new Set(
        this.bursts.filter((b) => b.atSec < pos.videoTime - EPS).map((b) => b.id),
      );
      this.mode = "video";
      this.main.currentTime = pos.videoTime;
      if (this.playing && !this.checkTrigger(pos.videoTime))
        void this.main.play().catch(() => this.pause());
    } else {
      this.played = new Set(this.bursts.slice(0, pos.burstIndex).map((b) => b.id));
      this.startBurst(pos.burstIndex, pos.offset, this.playing);
    }
    this.emit();
  }

  /** Editor timeline clicks address video time. */
  seekVideo(videoTime: number) {
    this.seekComposite(
      this.bursts.reduce((t, b) => (b.atSec < videoTime - EPS ? t + b.durationSec : t), videoTime),
    );
  }

  setMuted(muted: boolean) {
    this.main.muted = muted;
    for (const b of this.bursts) {
      const el = this.burstElement(b.src);
      if (el) el.muted = muted;
    }
  }

  setVolume(volume: number) {
    this.main.volume = volume;
    for (const b of this.bursts) {
      const el = this.burstElement(b.src);
      if (el) el.volume = volume;
    }
  }

  dispose() {
    this.disposed = true;
    this.stopLoop();
    this.listeners.forEach((off) => off());
  }

  // --- internals --------------------------------------------------------------------------------

  /** Starts the next burst if the video is within one frame of it. Returns true when it did. */
  private checkTrigger(videoTime: number): boolean {
    if (this.mode !== "video") return false;
    const i = nextBurstIndex(videoTime, this.bursts, this.played);
    if (i < 0) return false;
    const b = this.bursts[i]!;
    if (b.atSec - videoTime > FRAME + EPS) return false;
    this.startBurst(i, 0, this.playing, true);
    return true;
  }

  private startBurst(index: number, offset: number, autoplay: boolean, fromPlayback = false) {
    const b = this.bursts[index];
    if (!b) return;
    const el = this.burstElement(b.src);
    const triggerVideoTime = this.main.currentTime;
    const t0 = performance.now();
    this.main.pause();
    if (Math.abs(this.main.currentTime - b.atSec) > EPS && b.atSec <= this.duration) {
      this.main.currentTime = Math.min(b.atSec, this.duration);
    }
    if (!el) {
      // Clip missing: skip it rather than stall.
      this.played.add(b.id);
      if (autoplay) void this.main.play().catch(() => this.pause());
      return;
    }
    this.mode = "burst";
    this.burstIndex = index;
    this.active = el;
    el.currentTime = offset;
    el.dataset.active = "true";
    el.onended = () => this.handleBurstEnded(b.id);
    // G3 measures cuts reached by playback, not bursts entered by seeking.
    if (this.debug && fromPlayback && autoplay) this.logTiming(b, el, triggerVideoTime, t0);
    if (autoplay) void el.play().catch(() => this.pause());
    this.emit();
  }

  private stopBurst() {
    if (this.active) {
      this.active.pause();
      this.active.onended = null;
      delete this.active.dataset.active;
    }
    this.active = null;
    this.burstIndex = -1;
    this.mode = "video";
  }

  private handleBurstEnded(id: string) {
    if (this.disposed) return;
    const b = this.bursts.find((x) => x.id === id);
    this.played.add(id);
    this.stopBurst();
    if (b && b.atSec >= this.duration - FRAME) {
      // Burst at the end: the composite is finished (or another end burst follows).
      if (!this.checkTrigger(this.duration)) this.finish();
    } else if (this.playing && !this.checkTrigger(this.main.currentTime)) {
      void this.main.play().catch(() => this.pause());
    }
    this.emit();
  }

  private handleMainEnded() {
    if (this.mode === "video" && !this.checkTrigger(this.duration)) this.finish();
  }

  private finish() {
    this.playing = false;
    this.ended = true;
    this.stopLoop();
    this.emit();
  }

  private loop() {
    this.stopLoop();
    const tick = () => {
      if (!this.playing || this.disposed) return;
      if (this.mode === "video") this.checkTrigger(this.main.currentTime);
      this.emit();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    // Frame-accurate trigger where supported (Chrome, Safari 15.4+): mediaTime of each presented frame.
    const v = this.main;
    if (v.requestVideoFrameCallback) {
      const onFrame = (_now: number, meta: { mediaTime: number }) => {
        if (!this.playing || this.disposed) return;
        // Look one frame ahead: the next presented frame would already be past the cut.
        if (this.mode === "video") this.checkTrigger(meta.mediaTime);
        this.rvfc = v.requestVideoFrameCallback!(onFrame);
      };
      this.rvfc = v.requestVideoFrameCallback(onFrame);
    }
  }

  private stopLoop() {
    cancelAnimationFrame(this.raf);
    if (this.rvfc && this.main.cancelVideoFrameCallback)
      this.main.cancelVideoFrameCallback(this.rvfc);
    this.raf = 0;
    this.rvfc = 0;
  }

  private logTiming(b: EngineBurst, el: VideoWithRvfc, triggerVideoTime: number, t0: number) {
    const entry: BurstTiming = { burstId: b.id, atSec: b.atSec, triggerVideoTime, gapMs: null };
    window.__flashdPreviewLog?.push(entry);
    if (el.requestVideoFrameCallback) {
      el.requestVideoFrameCallback((now) => {
        entry.gapMs = Math.max(0, now - t0);
      });
    } else {
      el.addEventListener("playing", () => (entry.gapMs = performance.now() - t0), { once: true });
    }
  }

  private emit() {
    if (!this.disposed) this.onState(this.state);
  }
}
