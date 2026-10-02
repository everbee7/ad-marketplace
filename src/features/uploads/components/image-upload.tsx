"use client";

import { ImageUp, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ImageKind } from "@/config/enums";
import { limits } from "@/config/limits";
import { uploadToStorage } from "@/lib/storage-client";
import { cn } from "@/lib/utils";

import { startImageUpload } from "../actions";
import { IMAGE_ERROR } from "../schemas";

/** PRF-01 AC2 / AD-01 AC4: JPG, PNG or WebP up to 5 MB, uploaded straight to storage. */
export function ImageUpload({
  kind,
  label,
  value,
  onChange,
  shape = "square",
}: {
  kind: ImageKind;
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  shape?: "square" | "circle" | "wide";
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (
      !(limits.image.contentTypes as readonly string[]).includes(file.type) ||
      file.size > limits.image.maxSizeBytes
    ) {
      setError(IMAGE_ERROR);
      return;
    }
    setBusy(true);
    try {
      const res = await startImageUpload({
        kind,
        contentType: file.type as (typeof limits.image.contentTypes)[number],
        size: file.size,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      const uploaded = await uploadToStorage(res.data, file);
      onChange(uploaded.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="eyebrow text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-border bg-input",
            shape === "circle" && "size-16 rounded-full",
            shape === "square" && "size-16 rounded-md",
            shape === "wide" && "aspect-video w-32 rounded-md",
          )}
        >
          {value ? (
            <Image src={value} alt="" fill unoptimized className="object-cover" sizes="128px" />
          ) : (
            <ImageUp
              className="size-5 text-subtle-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Spinner label="Uploading" />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept={limits.image.contentTypes.join(",")}
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => onChange(null)}
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
      <p
        className={cn("text-xs", error ? "text-destructive" : "text-subtle-foreground")}
        role={error ? "alert" : undefined}
      >
        {error ?? "JPG, PNG or WebP, up to 5 MB."}
      </p>
    </div>
  );
}
