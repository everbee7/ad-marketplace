"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { formatTime } from "@/features/preview/timeline";
import { cn } from "@/lib/utils";

import { placementFor, type PlacedBurst } from "../bursts";

import { useFrameThumbnails } from "./use-frame-thumbnails";

export type EditorBurst = PlacedBurst & { title: string; available: boolean };

type Props = {
  videoUrl: string;
  duration: number;
  compositeDuration: number;
  bursts: EditorBurst[];
  selectedId: string | null;
  playhead: number;
  onSelect: (id: string) => void;
  onMove: (id: string, atSec: number) => void;
  onSeek: (videoTime: number) => void;
  onInvalid: (message: string) => void;
};

const STRIP = 8;

/** PRJ-02/03 timeline: drag markers (snapped, clamped, spaced), hover frame preview, playhead. */
export function TimelineEditor({
  videoUrl,
  duration,
  compositeDuration,
  bursts,
  selectedId,
  playhead,
  onSelect,
  onMove,
  onSeek,
  onInvalid,
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  const frameAt = useFrameThumbnails(videoUrl);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: string; atSec: number; invalid: string | null } | null>(
    null,
  );

  const timeAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return Math.min(Math.max(0, ((clientX - r.left) / r.width) * duration), duration);
  };
  const pct = (t: number) => `${duration > 0 ? (t / duration) * 100 : 0}%`;

  const startDrag = (e: PointerEvent<HTMLButtonElement>, b: EditorBurst) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(b.id);
    setDrag({ id: b.id, atSec: b.atSec, invalid: null });
  };
  const moveDrag = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const t = timeAt(e.clientX);
    setHover(t);
    const p = placementFor(bursts, t, duration, drag.id);
    setDrag(p.ok ? { ...drag, atSec: p.atSec, invalid: null } : { ...drag, invalid: p.message });
  };
  const endDrag = () => {
    if (!drag) return;
    const original = bursts.find((b) => b.id === drag.id);
    if (drag.invalid) onInvalid(drag.invalid);
    if (original && original.atSec !== drag.atSec) onMove(drag.id, drag.atSec);
    setDrag(null);
    setHover(null);
  };

  const nudge = (e: KeyboardEvent<HTMLButtonElement>, b: EditorBurst) => {
    const step = e.shiftKey ? 1 : 0.1;
    const delta = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    if (!delta) return;
    e.preventDefault();
    const p = placementFor(bursts, b.atSec + delta, duration, b.id);
    if (p.ok) onMove(b.id, p.atSec);
    else onInvalid(p.message);
  };

  const hoverFrame = hover !== null ? frameAt(hover) : null;
  const strip = Array.from({ length: STRIP }, (_, i) => frameAt((duration * (i + 0.5)) / STRIP));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="eyebrow">Timeline</span>
        {/* PRJ-03 AC3 */}
        <span>
          Video {formatTime(duration)} ·{" "}
          <strong className="text-foreground">
            Total with ads {formatTime(compositeDuration)}
          </strong>
        </span>
      </div>
      <div
        ref={track}
        className="relative h-16 cursor-pointer touch-none overflow-visible rounded-md border border-border bg-surface select-none"
        onPointerMove={(e) => !drag && setHover(timeAt(e.clientX))}
        onPointerLeave={() => !drag && setHover(null)}
        onClick={(e) => onSeek(timeAt(e.clientX))}
        role="group"
        aria-label="Burst timeline. Select a marker and use arrow keys to move it by 0.1 s, or Shift + arrow for 1 s."
      >
        <div
          className="absolute inset-0 flex overflow-hidden rounded-md opacity-60"
          aria-hidden="true"
        >
          {strip.map((src, i) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element -- in-memory canvas data URL
              <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />
            ) : (
              <div key={i} className="h-full flex-1 border-r border-black/40 bg-white/5" />
            ),
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-white"
          style={{ left: pct(playhead) }}
          aria-hidden="true"
        />
        {bursts.map((b) => {
          const isDrag = drag?.id === b.id;
          const at = isDrag ? drag.atSec : b.atSec;
          return (
            <button
              key={b.id}
              type="button"
              aria-label={`${b.title} at ${formatTime(b.atSec)}${b.available ? "" : ", unavailable"}`}
              aria-pressed={selectedId === b.id}
              onPointerDown={(e) => startDrag(e, b)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => nudge(e, b)}
              className={cn(
                "absolute top-1 bottom-1 z-10 w-3 -translate-x-1/2 cursor-grab rounded-sm border transition-shadow",
                b.available
                  ? "border-white/30 bg-primary"
                  : "border-destructive bg-[repeating-linear-gradient(45deg,var(--destructive)_0_3px,transparent_3px_6px)]",
                selectedId === b.id && "border-white shadow-glow-primary",
                isDrag && "cursor-grabbing opacity-80",
                isDrag && drag.invalid && "border-destructive",
              )}
              style={{ left: pct(at) }}
            />
          );
        })}
        {hover !== null && (
          <div
            className="pointer-events-none absolute bottom-full z-20 mb-2 flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left: pct(drag ? drag.atSec : hover) }}
          >
            {hoverFrame && (
              // eslint-disable-next-line @next/next/no-img-element -- in-memory canvas data URL
              <img src={hoverFrame} alt="" className="w-28 rounded border border-border" />
            )}
            <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
              {formatTime(drag ? drag.atSec : hover)}
            </span>
            {drag?.invalid && (
              <span className="rounded bg-destructive px-1.5 py-0.5 text-[11px] text-white">
                {drag.invalid}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
