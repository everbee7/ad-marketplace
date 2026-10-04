"use client";

import { AlertTriangle, Check, CircleAlert, Pencil, Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StateChip } from "@/features/ads/components/status-chip";
import type { AdCardDTO } from "@/features/marketplace/schemas";
import { PreviewPlayer, type PreviewHandle } from "@/features/preview/components/preview-player";
import { compositeDuration, formatTime } from "@/features/preview/timeline";
import { limits } from "@/config/limits";

import { renameProject, saveProject, updateBursts } from "../actions";
import { BURST_MESSAGES, nearestFreeSlot, placementFor, sortPlaced } from "../bursts";
import type { ProjectAdDTO, ProjectEditorDTO } from "../schemas";

import { AdPicker } from "./ad-picker";
import { BurstList, type ListBurst } from "./burst-list";
import { TimelineEditor } from "./timeline-editor";
import { useAutoSave, useLeaveGuard } from "./use-auto-save";

const timeFmt = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

function adFromCard(ad: AdCardDTO): ProjectAdDTO {
  return {
    id: ad.id,
    title: ad.title,
    url: ad.videoUrl,
    posterUrl: ad.posterUrl,
    durationSec: ad.durationSec,
    aspectRatio: ad.aspectRatio,
    available: true,
  };
}

/** PRJ-02..07 editor: preview + timeline + burst list, auto-saved. */
export function ProjectEditor({
  project,
  savedAds,
  debugPreview = false,
}: {
  project: ProjectEditorDTO;
  savedAds: AdCardDTO[];
  debugPreview?: boolean;
}) {
  const router = useRouter();
  const player = useRef<PreviewHandle>(null);
  const duration = project.video.durationSec;
  const [bursts, setBursts] = useState<ListBurst[]>(project.bursts);
  const [selected, setSelected] = useState<string | null>(project.bursts[0]?.id ?? null);
  const [playhead, setPlayhead] = useState(0);
  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "swap"; id: string } | null>(null);
  const [status, setProjectStatus] = useState(project.status);
  const [name, setName] = useState(project.name);
  const [editingName, setEditingName] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const auto = useAutoSave<ListBurst[]>({
    initialRevision: project.revision,
    initialSavedAt: project.updatedAt,
    save: async (value, revision) => {
      const res = await updateBursts({
        id: project.id,
        revision,
        bursts: value.map((b) => ({ id: b.id, adId: b.ad.id, atSec: b.atSec })),
      });
      if (res.ok) setProjectStatus(res.data.status);
      return res;
    },
  });
  useLeaveGuard(auto.status === "dirty" || auto.status === "saving" || auto.status === "error");

  const commit = useCallback(
    (next: ListBurst[]) => {
      const sorted = sortPlaced(next.map((b) => ({ ...b, adId: b.ad.id }))) as (ListBurst & {
        adId: string;
      })[];
      setBursts(sorted);
      auto.schedule(sorted);
    },
    [auto],
  );

  const placed = useMemo(
    () => bursts.map((b) => ({ id: b.id, adId: b.ad.id, atSec: b.atSec })),
    [bursts],
  );
  const unavailable = bursts.filter((b) => !b.ad.available);

  // --- edits ----------------------------------------------------------------------------------

  const moveBurst = (id: string, atSec: number): string | null => {
    const p = placementFor(placed, atSec, duration, id);
    if (!p.ok) return p.message;
    commit(bursts.map((b) => (b.id === id ? { ...b, atSec: p.atSec } : b)));
    return null;
  };

  const addAd = (ad: AdCardDTO) => {
    const at = nearestFreeSlot(placed, player.current?.videoTime() ?? playhead, duration);
    if (at === null) {
      toast.error(
        bursts.length >= limits.project.maxBursts ? BURST_MESSAGES.max : BURST_MESSAGES.spacing,
      );
      return;
    }
    const id = nanoid(10);
    commit([...bursts, { id, atSec: at, ad: adFromCard(ad) }]);
    setSelected(id);
    setPicker(null);
    toast.success(`Burst added at ${formatTime(at)}`);
  };

  const swapAd = (burstId: string, ad: AdCardDTO) => {
    commit(bursts.map((b) => (b.id === burstId ? { ...b, ad: adFromCard(ad) } : b)));
    setPicker(null);
  };

  const removeBurst = (id: string) => {
    commit(bursts.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
  };

  const removeUnavailable = () => commit(bursts.filter((b) => b.ad.available));

  const explicitSave = async () => {
    const ok = await auto.flush();
    if (!ok) return;
    const res = await saveProject({ id: project.id, revision: auto.revision() });
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    auto.setRevision(res.data.revision, res.data.updatedAt);
    setProjectStatus("saved");
    toast.success("Project saved");
    router.refresh();
  };

  const saveName = async () => {
    setEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) {
      setName(project.name);
      return;
    }
    const res = await renameProject({ id: project.id, name: trimmed });
    if (!res.ok) {
      toast.error(res.error.message);
      setName(project.name);
    }
  };

  const total = compositeDuration(
    duration,
    bursts
      .filter((b) => b.ad.available)
      .map((b) => ({ id: b.id, atSec: b.atSec, durationSec: b.ad.durationSec })),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {editingName ? (
            <Input
              autoFocus
              aria-label="Project name"
              value={name}
              maxLength={limits.text.titleMax}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-64"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="group flex min-w-0 items-center gap-2 text-left"
            >
              <h1 className="panel-title truncate">{name}</h1>
              <Pencil
                className="size-3.5 shrink-0 text-subtle-foreground group-hover:text-foreground"
                aria-label="Rename project"
              />
            </button>
          )}
          <StateChip
            label={status === "saved" ? "Saved" : "Draft"}
            tone={status === "saved" ? "success" : "muted"}
          />
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator
            status={auto.status}
            savedAt={auto.savedAt}
            error={auto.error}
            onRetry={() => void auto.flush()}
          />
          <Button
            onClick={explicitSave}
            disabled={auto.status === "saving" || auto.status === "conflict"}
          >
            Save project
          </Button>
        </div>
      </header>

      {auto.status === "conflict" && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px]"
        >
          <span>{auto.error}</span>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      )}

      {/* PRJ-07 AC1/AC2 */}
      {unavailable.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-[13px]"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
            {unavailable.length === 1
              ? "1 ad in this project is"
              : `${unavailable.length} ads in this project are`}{" "}
            no longer available. The preview skips {unavailable.length === 1 ? "it" : "them"}; swap
            or remove {unavailable.length === 1 ? "it" : "them"}.
          </span>
          <Button size="sm" variant="outline" onClick={removeUnavailable}>
            Remove unavailable
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <PreviewPlayer
            ref={player}
            video={project.video}
            debug={debugPreview}
            onVideoTime={setPlayhead}
            bursts={bursts.map((b) => ({
              id: b.id,
              atSec: b.atSec,
              durationSec: b.ad.durationSec,
              src: b.ad.url,
              available: b.ad.available,
            }))}
          />
          {/* PRJ-02 AC1: phones get the simplified layout without timeline dragging. */}
          <div className="hidden md:block">
            <TimelineEditor
              videoUrl={project.video.url}
              duration={duration}
              compositeDuration={total}
              bursts={bursts.map((b) => ({
                id: b.id,
                adId: b.ad.id,
                atSec: b.atSec,
                title: b.ad.title,
                available: b.ad.available,
              }))}
              selectedId={selected}
              playhead={playhead}
              onSelect={setSelected}
              onMove={(id, t) => moveBurst(id, t)}
              onSeek={(t) => player.current?.seekVideo(t)}
              onInvalid={(m) => setNotice(m)}
            />
          </div>
          <p className="text-xs text-muted-foreground md:hidden">
            Total with ads {formatTime(total)}. Edit timestamps in the list; drag on the timeline
            from a tablet or desktop.
          </p>
          {notice && (
            <p role="alert" className="text-xs text-destructive">
              {notice}
            </p>
          )}
        </div>
        <aside className="flex flex-col gap-4" aria-label="Burst list">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">
              Bursts · {bursts.length}/{limits.project.maxBursts}
            </h2>
            <Button
              size="sm"
              onClick={() => setPicker({ mode: "add" })}
              disabled={bursts.length >= limits.project.maxBursts}
            >
              <Plus className="size-3.5" aria-hidden="true" /> Add burst
            </Button>
          </div>
          <BurstList
            bursts={bursts}
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id);
              const b = bursts.find((x) => x.id === id);
              if (b) player.current?.seekVideo(b.atSec);
            }}
            onTime={(id, t) => {
              const problem = moveBurst(id, t);
              setNotice(problem);
              return problem;
            }}
            onSwap={(id) => setPicker({ mode: "swap", id })}
            onRemove={removeBurst}
          />
        </aside>
      </div>

      <AdPicker
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        saved={savedAds}
        title={picker?.mode === "swap" ? "Swap ad" : `Add a burst at ${formatTime(playhead)}`}
        onPick={(ad) => (picker?.mode === "swap" ? swapAd(picker.id, ad) : addAd(ad))}
      />
    </div>
  );
}

function SaveIndicator({
  status,
  savedAt,
  error,
  onRetry,
}: {
  status: string;
  savedAt: string;
  error: string | null;
  onRetry: () => void;
}) {
  if (status === "saving" || status === "dirty") {
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        <Spinner label="Saving" /> Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-2 text-xs text-destructive" role="alert">
        <CircleAlert className="size-3.5" aria-hidden="true" /> {error ?? "Save failed."}
        <button type="button" onClick={onRetry} className="underline underline-offset-4">
          Retry
        </button>
      </span>
    );
  }
  if (status === "conflict") return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      <Check className="size-3.5 text-success" aria-hidden="true" /> Saved ·{" "}
      {timeFmt.format(new Date(savedAt))}
    </span>
  );
}
