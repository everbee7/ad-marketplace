"use client";

import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { PreviewEngine, type EngineBurst, type EngineState } from "../engine";
import { burstSegments, formatTime } from "../timeline";
import { usePreloadedClips } from "../use-preloaded-clips";

// PRV-01..04: one continuous video with a single timeline. Unavailable bursts are skipped and the
// player says so (PRJ-07 AC2).

export type PreviewBurst = {
  id: string;
  atSec: number;
  durationSec: number;
  src: string | null;
  available: boolean;
};

export type PreviewHandle = {
  seekVideo: (videoTime: number) => void;
  pause: () => void;
  videoTime: () => number;
};

type Props = {
  video: {
    url: string;
    posterUrl: string | null;
    durationSec: number;
    aspectRatio: "vertical" | "horizontal" | "square";
  };
  bursts: PreviewBurst[];
  onVideoTime?: (videoTime: number) => void;
  className?: string;
  debug?: boolean;
};

const SEEK_STEP = 5;

export const PreviewPlayer = forwardRef<PreviewHandle, Props>(function PreviewPlayer(
  { video, bursts, onVideoTime, className, debug = false },
  ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLVideoElement>(null);
  const burstEls = useRef(new Map<string, HTMLVideoElement>());
  const engine = useRef<PreviewEngine | null>(null);
  const [state, setState] = useState<EngineState | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  // The parent re-renders on every playhead tick; only react when the bursts really change.
  const signature = bursts
    .map((b) => `${b.id}@${b.atSec}:${b.durationSec}:${b.available ? b.src : "-"}`)
    .join("|");
  const playable = useMemo(
    () => bursts.filter((b): b is PreviewBurst & { src: string } => b.available && !!b.src),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content, not identity
    [signature],
  );
  const skipped = bursts.length - playable.length;
  const clips = usePreloadedClips(playable.map((b) => b.src));
  const distinctSrcs = useMemo(() => [...new Set(playable.map((b) => b.src))], [playable]);

  const timeline: EngineBurst[] = useMemo(
    () =>
      playable.map((b) => ({ id: b.id, atSec: b.atSec, durationSec: b.durationSec, src: b.src })),
    [playable],
  );

  // Create the engine once the main element exists.
  useEffect(() => {
    if (!main.current) return;
    const e = new PreviewEngine(
      main.current,
      (src) => burstEls.current.get(src) ?? null,
      setState,
      debug,
    );
    engine.current = e;
    return () => {
      e.dispose();
      engine.current = null;
    };
  }, [debug]);

  // PRV-03 AC1: edits apply without a reload, keeping the playhead.
  useEffect(() => {
    engine.current?.setTimeline(video.durationSec, timeline);
  }, [timeline, video.durationSec]);

  useEffect(() => {
    if (state) onVideoTime?.(state.videoTime);
  }, [state, onVideoTime]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      seekVideo: (t) => engine.current?.seekVideo(t),
      pause: () => engine.current?.pause(),
      videoTime: () => main.current?.currentTime ?? 0,
    }),
    [],
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      engine.current?.setMuted(!m);
      return !m;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = container.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  }, []);

  // PRV-02 keyboard: Space, ← →, M, F.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const eng = engine.current;
    if (!eng || (e.target as HTMLElement).closest("input,button[role=slider]")) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      eng.toggle();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      eng.seekComposite(eng.state.compositeTime - SEEK_STEP);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      eng.seekComposite(eng.state.compositeTime + SEEK_STEP);
    } else if (e.key === "m" || e.key === "M") {
      toggleMute();
    } else if (e.key === "f" || e.key === "F") {
      toggleFullscreen();
    }
  };

  const total = state?.compositeDuration ?? video.durationSec;
  const current = state?.compositeTime ?? 0;
  const segments = burstSegments(timeline);
  const inBurst = state?.mode === "burst";
  const loading = clips.status === "loading";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        ref={container}
        tabIndex={0}
        role="region"
        aria-label="Preview player. Space plays or pauses, arrow keys seek 5 seconds, M mutes, F toggles fullscreen."
        onKeyDown={onKeyDown}
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border bg-black outline-none focus-visible:border-primary",
          fullscreen ? "flex h-full w-full flex-col" : "",
        )}
      >
        <div className={cn("relative w-full", fullscreen ? "flex-1" : "aspect-video")}>
          <video
            ref={main}
            src={video.url}
            poster={video.posterUrl ?? undefined}
            preload="auto"
            playsInline
            className="absolute inset-0 h-full w-full object-contain"
            onClick={() => engine.current?.toggle()}
          />
          {distinctSrcs.map((src) => (
            <video
              key={src}
              ref={(el) => {
                if (el) burstEls.current.set(src, el);
                else burstEls.current.delete(src);
              }}
              src={clips.urls[src] ?? src}
              preload="auto"
              playsInline
              aria-hidden="true"
              // PRV-01 AC4: letterboxed inside the creator frame, never stretched or cropped.
              className="pointer-events-none absolute inset-0 h-full w-full bg-black object-contain opacity-0 data-[active=true]:opacity-100"
            />
          ))}
          {inBurst && (
            <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.1em] text-white uppercase">
              Ad
            </span>
          )}
          {loading && (
            <span className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs">
              <Spinner label="Loading ads" /> Loading ads…
            </span>
          )}
          {!state?.playing && (
            <button
              type="button"
              onClick={() => engine.current?.play()}
              aria-label="Play preview"
              className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full border border-white/40 bg-black/50 opacity-90 transition-opacity hover:opacity-100"
            >
              <Play className="size-7 translate-x-0.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border/60 bg-black/80 px-3 py-2">
          <button
            type="button"
            aria-label={state?.playing ? "Pause" : "Play"}
            onClick={() => engine.current?.toggle()}
            className="flex size-9 items-center justify-center rounded-md hover:bg-white/10"
          >
            {state?.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <ProgressBar
            current={current}
            total={total}
            segments={segments}
            onSeek={(t) => engine.current?.seekComposite(t)}
          />
          <span
            className="shrink-0 font-mono text-[11px] text-foreground-secondary tabular-nums"
            aria-live="off"
          >
            {formatTime(current)} / {formatTime(total)}
          </span>
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className="flex size-9 items-center justify-center rounded-md hover:bg-white/10"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              engine.current?.setVolume(v);
            }}
            className="hidden w-20 accent-[var(--primary)] sm:block"
          />
          <button
            type="button"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={toggleFullscreen}
            className="flex size-9 items-center justify-center rounded-md hover:bg-white/10"
          >
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>
      {skipped > 0 && (
        <p role="status" className="text-xs text-warning">
          {skipped === 1 ? "1 burst is" : `${skipped} bursts are`} unavailable and skipped in the
          preview.
        </p>
      )}
    </div>
  );
});

/** PRV-01 AC2: one bar for the composite duration with the burst segments highlighted. */
function ProgressBar({
  current,
  total,
  segments,
  onSeek,
}: {
  current: number;
  total: number;
  segments: { id: string; start: number; end: number }[];
  onSeek: (t: number) => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const pct = (t: number) => `${total > 0 ? (t / total) * 100 : 0}%`;
  const seekAt = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    onSeek(((clientX - r.left) / r.width) * total);
  };
  return (
    <div
      ref={bar}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(total * 10) / 10}
      aria-valuenow={Math.round(current * 10) / 10}
      aria-valuetext={`${formatTime(current)} of ${formatTime(total)}`}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        seekAt(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) seekAt(e.clientX);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onSeek(current - SEEK_STEP);
        else if (e.key === "ArrowRight") onSeek(current + SEEK_STEP);
        else return;
        e.preventDefault();
        e.stopPropagation();
      }}
      className="relative flex h-6 flex-1 cursor-pointer items-center"
    >
      <div className="relative h-1 w-full rounded-full bg-white/20">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white"
          style={{ width: pct(current) }}
        />
        {segments.map((s) => (
          <div
            key={s.id}
            className="absolute inset-y-0 bg-primary"
            style={{ left: pct(s.start), width: pct(s.end - s.start) }}
            aria-hidden="true"
          />
        ))}
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
          style={{ left: pct(current) }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
