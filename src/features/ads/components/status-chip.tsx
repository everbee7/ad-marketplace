import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdStatus } from "@/config/enums";
import { cn } from "@/lib/utils";

import { AD_STATUS_INFO } from "../lifecycle";

// DESIGN §2.1 status chips: always a text label, colour is never the only signal (AD-03 AC2).

const tone: Record<AdStatus, string> = {
  uploading: "border-white/30 bg-white/5 text-muted-foreground",
  failed: "border-destructive/40 bg-destructive/12 text-destructive",
  pending_review: "border-warning/40 bg-warning/12 text-warning",
  live: "border-success/40 bg-success/12 text-success",
  unlisted: "border-white/30 bg-white/5 text-muted-foreground",
  rejected: "border-destructive/40 bg-destructive/12 text-destructive",
  removed: "border-destructive/60 bg-surface-raised text-destructive",
};

export function StatusChip({
  status,
  className,
  withTooltip = true,
}: {
  status: AdStatus;
  className?: string;
  withTooltip?: boolean;
}) {
  const info = AD_STATUS_INFO[status];
  const chip = (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full border px-2 font-display text-[11px] font-medium tracking-[0.1em] whitespace-nowrap uppercase",
        tone[status],
        className,
      )}
      tabIndex={withTooltip ? 0 : undefined}
    >
      {info.label}
    </span>
  );
  if (!withTooltip) return chip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent className="max-w-64">{info.tooltip}</TooltipContent>
    </Tooltip>
  );
}

/** Generic chip for video/project states (DESIGN §2.1). */
export function StateChip({
  label,
  tone: t,
}: {
  label: string;
  tone: "success" | "muted" | "destructive" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full border px-2 font-display text-[11px] font-medium tracking-[0.1em] whitespace-nowrap uppercase",
        t === "success" && "border-success/40 bg-success/12 text-success",
        t === "muted" && "border-white/30 bg-white/5 text-muted-foreground",
        t === "destructive" && "border-destructive/40 bg-destructive/12 text-destructive",
        t === "warning" && "border-warning/40 bg-warning/12 text-warning",
      )}
    >
      {label}
    </span>
  );
}
