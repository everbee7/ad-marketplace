"use client";

import { Film } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils";

import { formatBytes } from "../client";

/** Drop zone (DESIGN §7 Upload flow): dashed 1 px white 20 % border, radius 12. */
export function VideoDrop({
  accept,
  hint,
  file,
  onFile,
  disabled,
  invalid,
}: {
  accept: string;
  hint: string;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) onFile(e.dataTransfer.files[0] ?? null);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
        over ? "border-primary bg-primary/5" : "border-white/20",
        invalid && "border-destructive",
        disabled && "opacity-60",
      )}
    >
      <Film className="size-8 text-foreground-secondary" strokeWidth={1.5} aria-hidden="true" />
      {file ? (
        <p className="text-[13px]">
          <span className="font-bold">{file.name}</span>{" "}
          <span className="text-subtle-foreground">· {formatBytes(file.size)}</span>
        </p>
      ) : (
        <p className="text-[13px] text-foreground-secondary">Drag a video here, or</p>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className={cn(
          "inline-flex h-11 cursor-pointer items-center rounded-sm border border-white/30 px-4 font-display text-[11px] font-medium tracking-[0.09em] uppercase hover:border-white lg:h-8",
          disabled && "pointer-events-none",
        )}
      >
        {file ? "Choose another file" : "Choose a file"}
      </label>
      <p className="text-xs text-subtle-foreground">{hint}</p>
    </div>
  );
}
