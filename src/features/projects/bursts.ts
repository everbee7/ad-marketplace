import { limits } from "@/config/limits";

// PRD §10 / PRJ-03 placement rules, shared by the editor (inline messages, AC1) and the server.

const { maxBursts, minBurstSpacingSec, timestampPrecisionSec } = limits.project;

export type PlacedBurst = { id: string; adId: string; atSec: number };

export const BURST_MESSAGES = {
  max: `A project can have at most ${maxBursts} bursts.`,
  spacing: `Bursts must be at least ${minBurstSpacingSec.toFixed(1)} s apart.`,
  format: "Use the format m:ss.s, for example 1:05.5.",
};

/** Snaps to 0.1 s. Works in integer tenths with an epsilon, so 3.15 (stored as 3.1499…) → 3.2. */
export function roundToPrecision(sec: number): number {
  const tenths = Math.round(sec / timestampPrecisionSec + 1e-9);
  return tenths / Math.round(1 / timestampPrecisionSec);
}

/** Clamps to [0, video duration] and snaps to 0.1 s (PRJ-03 AC1: "clamped or rejected"). */
export function clampTimestamp(sec: number, videoDuration: number): number {
  const max = Math.floor(videoDuration / timestampPrecisionSec) * timestampPrecisionSec;
  return roundToPrecision(Math.min(Math.max(0, sec), max));
}

/** Parses "m:ss.s", "ss.s" or plain seconds. Returns null when it can't. */
export function parseTimestamp(input: string): number | null {
  const s = input.trim();
  const m = /^(?:(\d+):)?(\d{1,2}(?:\.\d+)?|\d+(?:\.\d+)?)$/.exec(s);
  if (!m) return null;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = Number(m[2]);
  if (m[1] && seconds >= 60) return null;
  return minutes * 60 + seconds;
}

export function sortPlaced<T extends PlacedBurst>(bursts: readonly T[]): T[] {
  return [...bursts].sort((a, b) => a.atSec - b.atSec);
}

/** Why `bursts` breaks the rules, or null. Assumes timestamps are already clamped. */
export function burstsProblem(
  bursts: readonly PlacedBurst[],
  videoDuration: number,
): string | null {
  if (bursts.length > maxBursts) return BURST_MESSAGES.max;
  const sorted = sortPlaced(bursts);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (b.atSec < 0 || b.atSec > videoDuration + 1e-6)
      return `Timestamps must be between 0:00.0 and the end of the video.`;
    if (Math.abs(roundToPrecision(b.atSec) - b.atSec) > 1e-6)
      return "Timestamps use steps of 0.1 s.";
    const prev = sorted[i - 1];
    if (prev && b.atSec - prev.atSec < minBurstSpacingSec - 1e-6) return BURST_MESSAGES.spacing;
  }
  if (new Set(bursts.map((b) => b.id)).size !== bursts.length) return "Duplicate burst ids.";
  return null;
}

/** Can a burst move/land at `atSec`? Returns the clamped time or a reason (PRJ-03 AC1). */
export function placementFor(
  bursts: readonly PlacedBurst[],
  atSec: number,
  videoDuration: number,
  ignoreId?: string,
): { ok: true; atSec: number } | { ok: false; message: string } {
  const others = bursts.filter((b) => b.id !== ignoreId);
  if (!ignoreId && others.length >= maxBursts) return { ok: false, message: BURST_MESSAGES.max };
  const t = clampTimestamp(atSec, videoDuration);
  const tooClose = others.some((b) => Math.abs(b.atSec - t) < minBurstSpacingSec - 1e-6);
  return tooClose ? { ok: false, message: BURST_MESSAGES.spacing } : { ok: true, atSec: t };
}

/** Nearest valid slot to `atSec` (used when adding at the playhead), or null if none fits. */
export function nearestFreeSlot(
  bursts: readonly PlacedBurst[],
  atSec: number,
  videoDuration: number,
): number | null {
  if (bursts.length >= maxBursts) return null;
  const perSec = Math.round(1 / timestampPrecisionSec);
  const target = Math.round(clampTimestamp(atSec, videoDuration) * perSec);
  const end = Math.round(videoDuration * perSec);
  for (let d = 0; d <= end; d++) {
    for (const candidate of [(target - d) / perSec, (target + d) / perSec]) {
      if (candidate < 0 || candidate > videoDuration) continue;
      const p = placementFor(bursts, candidate, videoDuration);
      if (p.ok) return p.atSec;
    }
  }
  return null;
}
