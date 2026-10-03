"use client";

import { Clapperboard, ImageOff, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { StateChip } from "@/features/ads/components/status-chip";
import { limits } from "@/config/limits";

import { deleteVideo, renameVideo } from "../actions";
import { formatDuration } from "../format";
import type { CreatorVideoDTO } from "../schemas";

import { RetryVideoUpload } from "./video-upload-form";

const STATE: Record<
  CreatorVideoDTO["status"],
  { label: string; tone: "success" | "muted" | "destructive" }
> = {
  uploading: { label: "Uploading…", tone: "muted" },
  ready: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
};

/** VID-02: thumbnail, title, duration, status, project count; Rename, Create project, Delete. */
export function VideoList({ videos }: { videos: CreatorVideoDTO[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="My videos">
      {videos.map((v) => (
        <li key={v.id}>
          <VideoTile video={v} />
        </li>
      ))}
    </ul>
  );
}

function VideoTile({ video }: { video: CreatorVideoDTO }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [title, setTitle] = useState(video.title);
  const state = STATE[video.status];

  const doRename = () =>
    start(async () => {
      const res = await renameVideo({ id: video.id, title });
      if (!res.ok) return void toast.error(res.error.message);
      toast.success("Video renamed");
      setRenaming(false);
      router.refresh();
    });

  const doDelete = () =>
    start(async () => {
      const res = await deleteVideo({ id: video.id });
      if (!res.ok) return void toast.error(res.error.message);
      toast.success(
        res.data.deletedProjects
          ? `Video and ${res.data.deletedProjects} project(s) deleted`
          : "Video deleted",
      );
      setDeleting(false);
      router.refresh();
    });

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="relative aspect-video bg-black">
        {video.posterUrl ? (
          <Image
            src={video.posterUrl}
            alt=""
            fill
            unoptimized
            className="object-contain"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-subtle-foreground">
            <ImageOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
        <span className="absolute top-2 right-2 rounded-full border border-white/30 bg-black/70 px-2 py-0.5 font-display text-[11px] font-medium">
          {formatDuration(video.durationSec)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 font-display text-[13px] leading-snug font-bold break-words">
            {video.title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${video.title}`}
                disabled={pending}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil className="size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-destructive">
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StateChip label={state.label} tone={state.tone} />
          {video.hidden && <StateChip label="Hidden by admin" tone="warning" />}
          <span className="text-[11px] text-muted-foreground">
            {video.projectCount} {video.projectCount === 1 ? "project" : "projects"}
          </span>
        </div>
        {video.status === "failed" && video.errorMessage && (
          <p className="text-xs text-destructive">{video.errorMessage}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {video.status === "ready" && !video.hidden && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/creator/projects/new?videoId=${video.id}`}>
                <Clapperboard className="size-3.5" aria-hidden="true" /> Create project
              </Link>
            </Button>
          )}
          {video.status === "failed" && (
            <Button variant="outline" size="sm" onClick={() => setRetrying(true)}>
              <RotateCcw className="size-3.5" aria-hidden="true" /> Retry upload
            </Button>
          )}
        </div>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename video</DialogTitle>
            <DialogDescription>Only you see this name.</DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Video title"
            value={title}
            maxLength={limits.text.titleMax}
            onChange={(e) => setTitle(e.target.value)}
          />
          <DialogFooter>
            <Button
              onClick={doRename}
              disabled={pending || title.trim().length < limits.text.titleMin}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              {video.projectCount > 0
                ? `${video.projectCount} ${video.projectCount === 1 ? "project uses" : "projects use"} this video and will be deleted.`
                : "No projects use this video."}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep video</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete video</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={retrying} onOpenChange={setRetrying}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry upload</DialogTitle>
            <DialogDescription>
              Choose the video file again. Title and description are kept.
            </DialogDescription>
          </DialogHeader>
          <RetryVideoUpload
            videoId={video.id}
            onDone={() => {
              setRetrying(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </article>
  );
}
