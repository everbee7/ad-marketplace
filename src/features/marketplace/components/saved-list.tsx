"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { AdCardDTO } from "../schemas";

import { AdCard } from "./ad-card";
import { useSaved } from "./saved-store";

/** MKT-05: saved ads, newest first; unavailable ones get an overlay and a Remove action (AC2). */
export function SavedList({ items }: { items: AdCardDTO[] }) {
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
      aria-label="Saved ads"
    >
      {items.map((ad) => (
        <SavedItem key={ad.id} ad={ad} />
      ))}
    </ul>
  );
}

function SavedItem({ ad }: { ad: AdCardDTO }) {
  const { saved } = useSaved(ad.id, true);
  if (!saved) return null; // un-saved from this page or elsewhere in the session (MKT-04 AC2)
  if (ad.available !== false) {
    return (
      <li>
        <AdCard ad={ad} canSave />
      </li>
    );
  }
  return (
    <li>
      <UnavailableCard ad={ad} />
    </li>
  );
}

function UnavailableCard({ ad }: { ad: AdCardDTO }) {
  const router = useRouter();
  const { toggle } = useSaved(ad.id, true);
  const [busy, setBusy] = useState(false);
  return (
    <article className="relative flex aspect-video flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-white/20 bg-surface p-4 text-center">
      <p className="eyebrow text-warning">Unavailable</p>
      <p className="line-clamp-2 text-[13px] font-bold">{ad.title}</p>
      <p className="text-xs text-subtle-foreground">This ad is no longer in the Marketplace.</p>
      <Button
        variant="destructive"
        size="xs"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await toggle();
          setBusy(false);
          router.refresh();
        }}
      >
        <Trash2 className="size-3.5" aria-hidden="true" /> Remove
      </Button>
    </article>
  );
}

export function SavedEmpty() {
  return (
    <div className="mt-16 flex flex-col items-center gap-6 text-center">
      <p className="eyebrow">No saved ads yet</p>
      <Button asChild>
        <Link href="/marketplace">Browse the Marketplace</Link>
      </Button>
    </div>
  );
}
