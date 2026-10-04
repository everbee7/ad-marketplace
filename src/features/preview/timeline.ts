// Composite timeline (ARCHITECTURE §8.1): the creator video with each burst inserted at `atSec`.
// Pure functions shared by the editor, the progress bar and the playback engine.

export type TimelineBurst = { id: string; atSec: number; durationSec: number };

export type CompositePosition =
  { kind: "video"; videoTime: number } | { kind: "burst"; burstIndex: number; offset: number };

const EPS = 1e-6;

/** Bursts sorted by video time (stable for equal times). */
export function sortBursts<T extends TimelineBurst>(bursts: readonly T[]): T[] {
  return [...bursts].sort((a, b) => a.atSec - b.atSec);
}

export function compositeDuration(videoDuration: number, bursts: readonly TimelineBurst[]): number {
  return videoDuration + bursts.reduce((sum, b) => sum + b.durationSec, 0);
}

/**
 * Composite time of a video position. At exactly a burst's `atSec` this returns the moment the
 * burst *starts* (the video pauses there, so the same frame also follows the burst).
 */
export function toComposite(videoTime: number, bursts: readonly TimelineBurst[]): number {
  let t = videoTime;
  for (const b of bursts) if (b.atSec < videoTime - EPS) t += b.durationSec;
  return t;
}

/** Composite time at which burst `index` (in sorted order) starts. */
export function burstStart(index: number, bursts: readonly TimelineBurst[]): number {
  const b = bursts[index];
  if (!b) throw new RangeError("burst index out of range");
  let t = b.atSec;
  for (let i = 0; i < index; i++) t += bursts[i]!.durationSec;
  return t;
}

/** Where the composite time `t` lands: inside the video or inside a burst (bursts must be sorted). */
export function fromComposite(
  t: number,
  videoDuration: number,
  bursts: readonly TimelineBurst[],
): CompositePosition {
  const time = Math.max(0, t);
  let acc = 0;
  for (let i = 0; i < bursts.length; i++) {
    const b = bursts[i]!;
    const start = b.atSec + acc;
    if (time < start - EPS) return { kind: "video", videoTime: time - acc };
    if (time < start + b.durationSec - EPS)
      return { kind: "burst", burstIndex: i, offset: time - start };
    acc += b.durationSec;
  }
  return { kind: "video", videoTime: Math.min(time - acc, videoDuration) };
}

/** Highlighted burst segments on the unified progress bar (PRV-01 AC2), in composite seconds. */
export function burstSegments(
  bursts: readonly TimelineBurst[],
): { id: string; start: number; end: number }[] {
  let acc = 0;
  return bursts.map((b) => {
    const start = b.atSec + acc;
    acc += b.durationSec;
    return { id: b.id, start, end: start + b.durationSec };
  });
}

/** Index of the next burst at or after `videoTime` that hasn't played yet, or -1. */
export function nextBurstIndex(
  videoTime: number,
  bursts: readonly TimelineBurst[],
  played: ReadonlySet<string>,
): number {
  for (let i = 0; i < bursts.length; i++) {
    const b = bursts[i]!;
    if (b.atSec >= videoTime - EPS && !played.has(b.id)) return i;
  }
  return -1;
}

/** m:ss.s for UI (composite or video time). */
export function formatTime(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}
