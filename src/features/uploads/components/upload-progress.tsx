"use client";

import { CircleAlert, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import type { UploadPhase } from "../use-media-upload";

/** AD-01 AC2 / VID-01 AC1: progress bar with percentage and Cancel; live status afterwards. */
export function UploadProgress({
  phase,
  onCancel,
  doneLabel,
}: {
  phase: UploadPhase;
  onCancel: () => void;
  doneLabel: (status: string) => string;
}) {
  if (phase.kind === "idle") return null;
  if (phase.kind === "error" || phase.kind === "cancelled") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px]"
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <span>{phase.kind === "cancelled" ? "Upload cancelled." : phase.message}</span>
      </div>
    );
  }
  if (phase.kind === "done") {
    const failed = phase.status === "failed";
    return (
      <div
        role="status"
        className={
          failed
            ? "flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px]"
            : "flex items-start gap-3 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-[13px]"
        }
      >
        {failed ? (
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        ) : (
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        )}
        <span>{failed ? (phase.message ?? "The upload failed.") : doneLabel(phase.status)}</span>
      </div>
    );
  }
  const percent = phase.kind === "uploading" ? phase.percent : phase.kind === "verifying" ? 100 : 0;
  const label =
    phase.kind === "checking"
      ? "Checking video…"
      : phase.kind === "verifying"
        ? "Verifying…"
        : `Uploading… ${percent}%`;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface px-4 py-4">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="flex items-center gap-2" aria-live="polite">
          <Spinner label={label} />
          {label}
        </span>
        {phase.kind === "uploading" && (
          <Button type="button" variant="destructive" size="xs" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1 w-full overflow-hidden rounded-full bg-white/20"
      >
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
