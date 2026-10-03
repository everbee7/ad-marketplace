"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// PRJ-03 AC2: frame thumbnails of the creator video, generated in the browser by seeking a hidden
// <video> and drawing to a canvas. Cached per 1 s bucket (ARCHITECTURE §7.3).

const WIDTH = 160;

function seekAndDraw(v: HTMLVideoElement, sec: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(null), 5000);
    v.onseeked = () => {
      window.clearTimeout(timeout);
      try {
        const h = Math.round((WIDTH * v.videoHeight) / Math.max(1, v.videoWidth));
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(v, 0, 0, WIDTH, h);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      } catch {
        resolve(null); // cross-origin or decode issue: no thumbnail for this bucket
      }
    };
    v.currentTime = Math.min(sec + 0.05, Math.max(0, (v.duration || sec) - 0.05));
  });
}

export function useFrameThumbnails(src: string) {
  const [frames, setFrames] = useState<Record<number, string>>({});
  const video = useRef<HTMLVideoElement | null>(null);
  const ready = useRef(false);
  const queue = useRef<number[]>([]);
  const draining = useRef(false);
  const requested = useRef(new Set<number>());

  /** Processes queued buckets one seek at a time. */
  const drain = useCallback(async () => {
    const v = video.current;
    if (!v || !ready.current || draining.current) return;
    draining.current = true;
    while (queue.current.length > 0) {
      const bucket = queue.current.shift()!;
      const url = await seekAndDraw(v, bucket);
      if (url) setFrames((f) => ({ ...f, [bucket]: url }));
    }
    draining.current = false;
  }, []);

  useEffect(() => {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.playsInline = true;
    if (new URL(src, window.location.href).origin !== window.location.origin)
      v.crossOrigin = "anonymous";
    v.onloadedmetadata = () => {
      ready.current = true;
      void drain();
    };
    v.src = src;
    video.current = v;
    return () => {
      ready.current = false;
      v.removeAttribute("src");
      v.load();
      video.current = null;
    };
  }, [src, drain]);

  /** Returns the cached frame for `sec` (1 s buckets), queueing it if needed. */
  const frameAt = useCallback(
    (sec: number): string | null => {
      const bucket = Math.max(0, Math.floor(sec));
      if (frames[bucket]) return frames[bucket];
      if (!requested.current.has(bucket)) {
        requested.current.add(bucket);
        queue.current.push(bucket);
        queueMicrotask(() => void drain());
      }
      return null;
    },
    [frames, drain],
  );

  return frameAt;
}
