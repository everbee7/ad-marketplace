"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActionResult } from "@/lib/errors";

import type { SaveResultDTO } from "../schemas";

// PRJ-04: auto-save as draft 1 s after the last edit; "Saving…" / "Saved · {time}"; a stale
// revision (another tab) surfaces as a conflict instead of overwriting.

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

export function useAutoSave<T>(opts: {
  initialRevision: number;
  initialSavedAt: string;
  save: (value: T, revision: number) => Promise<ActionResult<SaveResultDTO>>;
  delayMs?: number;
}) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(opts.initialSavedAt);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(opts.initialRevision);
  const pending = useRef<{ value: T } | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saveRef = useRef(opts.save);
  useEffect(() => {
    saveRef.current = opts.save;
  }, [opts.save]);

  const flush = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(timer.current);
    // Drain: keep saving while edits arrived during the previous save.
    for (;;) {
      if (inflight.current) await inflight.current;
      const next = pending.current;
      if (!next) return true;
      pending.current = null;
      setStatus("saving");
      let ok = false;
      inflight.current = (async () => {
        try {
          const res = await saveRef.current(next.value, revision.current);
          if (res.ok) {
            revision.current = res.data.revision;
            setSavedAt(res.data.updatedAt);
            setError(null);
            ok = true;
            setStatus(pending.current ? "dirty" : "saved");
          } else if (res.error.code === "CONFLICT") {
            setStatus("conflict");
            setError(res.error.message);
          } else {
            pending.current ??= next; // keep the edit so Retry can resend it
            setStatus("error");
            setError(res.error.message);
          }
        } catch {
          pending.current ??= next;
          setStatus("error");
          setError("Couldn't save. Check your connection.");
        }
      })();
      await inflight.current;
      inflight.current = null;
      if (!ok) return false;
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setStatus((s) => (s === "conflict" ? s : "dirty"));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), opts.delayMs ?? 1000);
    },
    [flush, opts.delayMs],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return {
    status,
    savedAt,
    error,
    schedule,
    flush,
    revision: () => revision.current,
    setRevision: (r: number, at: string) => {
      revision.current = r;
      setSavedAt(at);
    },
  };
}

/** PRJ-04 AC3: confirm before leaving while a save is pending, running or failed. */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // In-app links don't fire beforeunload; intercept them in the capture phase.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.defaultPrevented) return;
      if (!window.confirm("Your latest changes aren't saved yet. Leave anyway?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
}
