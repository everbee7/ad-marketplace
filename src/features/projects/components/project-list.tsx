"use client";

import { Copy, ImageOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { limits } from "@/config/limits";
import { StateChip } from "@/features/ads/components/status-chip";

import { deleteProject, duplicateProject, renameProject } from "../actions";
import type { ProjectListItemDTO } from "../schemas";

const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/** PRJ-05: thumbnail, name, video title, bursts, status, updated; Open, Rename, Duplicate, Delete. */
export function ProjectList({ projects }: { projects: ProjectListItemDTO[] }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Projects">
      {projects.map((p) => (
        <li key={p.id}>
          <ProjectRow project={p} />
        </li>
      ))}
    </ul>
  );
}

function ProjectRow({ project }: { project: ProjectListItemDTO }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(project.name);

  const act = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error?.message ?? "Something went wrong.");
      toast.success(success);
      setRenaming(false);
      setDeleting(false);
      router.refresh();
    });

  return (
    <article className="relative flex items-center gap-4 rounded-xl border border-border bg-surface p-3 transition-colors focus-within:border-primary hover:border-primary">
      <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-black sm:w-36">
        {project.posterUrl ? (
          <Image
            src={project.posterUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="144px"
          />
        ) : (
          <ImageOff
            className="absolute inset-0 m-auto size-5 text-subtle-foreground"
            aria-hidden="true"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[14px] font-bold">
          <Link
            href={`/creator/projects/${project.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {project.name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-xs text-foreground-secondary">{project.videoTitle}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <StateChip
            label={project.status === "saved" ? "Saved" : "Draft"}
            tone={project.status === "saved" ? "success" : "muted"}
          />
          <span>
            {project.burstCount} {project.burstCount === 1 ? "burst" : "bursts"}
          </span>
          {project.unavailableCount > 0 && (
            <StateChip label={`${project.unavailableCount} unavailable`} tone="warning" />
          )}
          <span>Updated {date.format(new Date(project.updatedAt))}</span>
        </div>
      </div>
      <div className="relative z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${project.name}`}
              disabled={pending}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/creator/projects/${project.id}`}>Open</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              <Pencil className="size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => act(() => duplicateProject({ id: project.id }), "Project duplicated")}
            >
              <Copy className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-destructive">
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input
            aria-label="Project name"
            value={name}
            maxLength={limits.text.titleMax}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={pending || !name.trim()}
              onClick={() => act(() => renameProject({ id: project.id, name }), "Project renamed")}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              The video stays in My videos. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep project</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => act(() => deleteProject({ id: project.id }), "Project deleted")}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
