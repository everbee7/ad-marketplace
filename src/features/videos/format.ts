// Shared by server and client components (a "use client" module can't export helpers to the server).

/** m:ss for video lengths. */
export function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
