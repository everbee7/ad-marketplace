"use client";

import { useEffect, useRef, useState } from "react";

// ARCHITECTURE §8.2: every distinct ad is fetched into memory (fetch → Blob → object URL) when the
// editor opens. Clips are ≤ 2 s, so switching to a burst never waits on the network. The cache
// lives as long as the player, so swapping bursts back and forth never refetches.

export type ClipState = { status: "loading" | "ready"; urls: Record<string, string> };

export function usePreloadedClips(sources: string[]): ClipState {
  const key = [...new Set(sources)].sort().join("|");
  const [cache, setCache] = useState<Record<string, string>>({});
  const inflight = useRef(new Set<string>());
  const created = useRef<string[]>([]);

  useEffect(() => {
    const list = created.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    const missing = (key ? key.split("|") : []).filter(
      (src) => !cache[src] && !inflight.current.has(src),
    );
    if (missing.length === 0) return;
    for (const src of missing) inflight.current.add(src);
    void Promise.all(
      missing.map(async (src) => {
        try {
          const res = await fetch(src, { credentials: "include" });
          if (!res.ok) throw new Error(String(res.status));
          const url = URL.createObjectURL(await res.blob());
          created.current.push(url);
          return [src, url] as const;
        } catch {
          return [src, src] as const; // fall back to streaming the original URL
        }
      }),
    ).then((pairs) => {
      for (const [src] of pairs) inflight.current.delete(src);
      setCache((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
  }, [key, cache]);

  const list = key ? key.split("|") : [];
  const urls: Record<string, string> = {};
  for (const src of list) if (cache[src]) urls[src] = cache[src];
  return { status: list.every((s) => urls[s]) ? "ready" : "loading", urls };
}
