"use client";

import { useCallback, useRef, useState } from "react";

import type { ActionResult } from "@/lib/errors";
import { uploadToStorage, type UploadTarget } from "@/lib/storage-client";

import { inspectVideoFile, type InspectedVideo } from "./client";

// Shared upload flow for ads (AD-01) and creator videos (VID-01 AC1: "same upload experience"):
// check → reserve → upload video + poster (progress, cancel) → server finalize.

export type UploadPhase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uploading"; percent: number }
  | { kind: "verifying" }
  | { kind: "done"; status: string; message: string | null }
  | { kind: "error"; message: string }
  | { kind: "cancelled" };

type Start = { id: string; video: UploadTarget; poster: UploadTarget };
type Finalized = { status: string; errorMessage: string | null };

export function useMediaUpload(opts: {
  kind: "ad" | "creatorVideo";
  finalize: (args: {
    id: string;
    videoUrl: string;
    posterUrl: string;
  }) => Promise<ActionResult<Finalized>>;
  cancel: (args: { id: string }) => Promise<ActionResult<null>>;
}) {
  const [phase, setPhase] = useState<UploadPhase>({ kind: "idle" });
  const abort = useRef<AbortController | null>(null);
  const docId = useRef<string | null>(null);

  const run = useCallback(
    async (
      file: File,
      start: (video: InspectedVideo) => Promise<ActionResult<Start>>,
    ): Promise<{ id: string; status: string } | null> => {
      setPhase({ kind: "checking" });
      const inspected = await inspectVideoFile(file, opts.kind);
      if (!inspected.ok) {
        setPhase({ kind: "error", message: inspected.problem });
        return null;
      }
      const started = await start(inspected.video);
      if (!started.ok) {
        setPhase({ kind: "error", message: started.error.message });
        return null;
      }
      const { id, video, poster } = started.data;
      docId.current = id;
      const controller = new AbortController();
      abort.current = controller;
      setPhase({ kind: "uploading", percent: 0 });
      try {
        const posterUpload = uploadToStorage(poster, inspected.video.poster, {
          signal: controller.signal,
        });
        const videoUpload = await uploadToStorage(video, file, {
          signal: controller.signal,
          onProgress: (p) => setPhase({ kind: "uploading", percent: Math.min(99, p.percentage) }),
        });
        const posterResult = await posterUpload;
        setPhase({ kind: "verifying" });
        const res = await opts.finalize({
          id,
          videoUrl: videoUpload.url,
          posterUrl: posterResult.url,
        });
        if (!res.ok) {
          setPhase({ kind: "error", message: res.error.message });
          return { id, status: "error" };
        }
        setPhase({ kind: "done", status: res.data.status, message: res.data.errorMessage });
        return { id, status: res.data.status };
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError")
        ) {
          setPhase({ kind: "cancelled" });
        } else {
          setPhase({ kind: "error", message: "The upload was interrupted. Please try again." });
        }
        await opts.cancel({ id }).catch(() => undefined);
        return { id, status: "failed" };
      } finally {
        abort.current = null;
      }
    },
    [opts],
  );

  const cancelUpload = useCallback(() => abort.current?.abort(), []);
  const reset = useCallback(() => setPhase({ kind: "idle" }), []);
  const busy =
    phase.kind === "checking" || phase.kind === "uploading" || phase.kind === "verifying";

  return { phase, run, cancel: cancelUpload, reset, busy, docId };
}
