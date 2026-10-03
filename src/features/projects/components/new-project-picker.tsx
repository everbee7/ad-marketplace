"use client";

import { Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDuration } from "@/features/videos/format";
import type { CreatorVideoDTO } from "@/features/videos/schemas";

import { createProject } from "../actions";

/** PRJ-01: choose a Ready video; an ad picked from the Marketplace comes along at 0.0 s. */
export function NewProjectPicker({
  videos,
  adId,
  adTitle,
  autoVideoId,
}: {
  videos: CreatorVideoDTO[];
  adId?: string;
  adTitle?: string;
  /** Preselected video ("Create project" on a video): created once after mount. */
  autoVideoId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const create = (videoId: string) =>
    start(async () => {
      setChosen(videoId);
      setError(null);
      const res = await createProject({ videoId, adId });
      if (!res.ok) {
        setError(res.error.message);
        setChosen(null);
        return;
      }
      router.replace(`/creator/projects/${res.data.id}`);
    });

  const auto = useRef(false);
  useEffect(() => {
    if (autoVideoId && !auto.current) {
      auto.current = true;
      create(autoVideoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the preselected video
  }, [autoVideoId]);

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <Film className="size-8 text-foreground-secondary" strokeWidth={1.5} aria-hidden="true" />
        <p className="eyebrow">No ready videos yet</p>
        <Button asChild>
          <Link href="/creator/videos/new">Upload a video</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {adTitle && (
        <p className="text-[13px] text-foreground-secondary">
          <strong className="text-foreground">{adTitle}</strong> will be placed at 0:00.0. You can
          move it in the editor.
        </p>
      )}
      {error && <FormMessage>{error}</FormMessage>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Ready videos">
        {videos.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => create(v.id)}
              className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-primary focus-visible:border-primary disabled:opacity-60"
            >
              <span className="relative aspect-video bg-black">
                {v.posterUrl && (
                  <Image
                    src={v.posterUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                )}
                <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px]">
                  {formatDuration(v.durationSec)}
                </span>
                {chosen === v.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Spinner label="Creating project" />
                  </span>
                )}
              </span>
              <span className="truncate px-4 py-3 text-[13px] font-bold">{v.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
