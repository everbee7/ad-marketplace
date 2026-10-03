"use client";

import { ArrowLeftRight, ImageOff, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/features/preview/timeline";
import { cn } from "@/lib/utils";

import { BURST_MESSAGES, parseTimestamp } from "../bursts";
import type { ProjectAdDTO } from "../schemas";

export type ListBurst = { id: string; atSec: number; ad: ProjectAdDTO };

/** PRJ-02 side panel: thumbnail, title, timestamp (editable m:ss.s), Swap and Remove. */
export function BurstList({
  bursts,
  selectedId,
  onSelect,
  onTime,
  onSwap,
  onRemove,
}: {
  bursts: ListBurst[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTime: (id: string, atSec: number) => string | null;
  onSwap: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (bursts.length === 0) {
    return <p className="eyebrow py-8 text-center">No bursts yet. Add one at the playhead.</p>;
  }
  return (
    <ol className="flex flex-col gap-2" aria-label="Bursts">
      {bursts.map((b, i) => (
        <BurstRow
          key={b.id}
          index={i}
          burst={b}
          selected={b.id === selectedId}
          onSelect={() => onSelect(b.id)}
          onTime={(t) => onTime(b.id, t)}
          onSwap={() => onSwap(b.id)}
          onRemove={() => onRemove(b.id)}
        />
      ))}
    </ol>
  );
}

function BurstRow({
  index,
  burst,
  selected,
  onSelect,
  onTime,
  onSwap,
  onRemove,
}: {
  index: number;
  burst: ListBurst;
  selected: boolean;
  onSelect: () => void;
  onTime: (atSec: number) => string | null;
  onSwap: () => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(formatTime(burst.atSec));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = editing ? text : formatTime(burst.atSec);

  const commit = () => {
    setEditing(false);
    const t = parseTimestamp(text);
    if (t === null) {
      setError(BURST_MESSAGES.format);
      return;
    }
    const problem = onTime(t);
    setError(problem);
  };

  return (
    <li
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-surface p-2.5 transition-colors",
        selected ? "border-primary" : "border-border",
        !burst.ad.available && "border-dashed border-destructive/60",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-4 shrink-0 text-center text-[11px] text-subtle-foreground">
          {index + 1}
        </span>
        <span className="relative aspect-video w-16 shrink-0 overflow-hidden rounded bg-black">
          {burst.ad.posterUrl ? (
            <Image
              src={burst.ad.posterUrl}
              alt=""
              fill
              unoptimized
              className="object-contain"
              sizes="64px"
            />
          ) : (
            <ImageOff
              className="absolute inset-0 m-auto size-4 text-subtle-foreground"
              aria-hidden="true"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold">{burst.ad.title}</p>
          <p className="text-[11px] text-subtle-foreground">
            {burst.ad.available ? (
              `${burst.ad.durationSec.toFixed(1)} s`
            ) : (
              <span className="text-destructive">Unavailable</span>
            )}
          </p>
        </div>
        <Input
          aria-label={`Timestamp for burst ${index + 1}`}
          value={shown}
          onFocus={() => {
            setText(formatTime(burst.atSec));
            setEditing(true);
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          aria-invalid={error ? true : undefined}
          className="h-9 w-20 shrink-0 px-2 text-center font-mono text-[12px] tabular-nums"
        />
      </div>
      {error && (
        <p role="alert" className="pl-7 text-[11px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-1.5">
        <Button
          type="button"
          variant={burst.ad.available ? "outline" : "default"}
          size="xs"
          onClick={onSwap}
        >
          <ArrowLeftRight className="size-3" aria-hidden="true" /> Swap
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          onClick={onRemove}
          aria-label={`Remove burst ${index + 1}`}
        >
          <Trash2 className="size-3" aria-hidden="true" /> Remove
        </Button>
      </div>
    </li>
  );
}
