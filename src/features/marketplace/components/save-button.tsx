"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useSaved } from "./saved-store";

/** MKT-04 toggle (creators only). */
export function SaveButton({
  adId,
  initial,
  title,
  variant = "icon",
}: {
  adId: string;
  initial: boolean;
  title: string;
  variant?: "icon" | "full";
}) {
  const { saved, toggle } = useSaved(adId, initial);
  const [busy, setBusy] = useState(false);
  const Icon = saved ? BookmarkCheck : Bookmark;
  const onClick = async () => {
    setBusy(true);
    await toggle();
    setBusy(false);
  };
  if (variant === "full") {
    return (
      <Button
        type="button"
        variant={saved ? "secondary" : "default"}
        aria-pressed={saved}
        onClick={onClick}
        disabled={busy}
      >
        <Icon className="size-4" aria-hidden="true" />
        {saved ? "Saved" : "Save"}
      </Button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex size-11 items-center justify-center rounded-full border bg-black/70 transition-colors lg:size-9",
        saved
          ? "border-primary text-primary"
          : "border-white/30 text-foreground hover:border-white",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
