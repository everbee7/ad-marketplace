"use client";

import { Check, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { REJECTION_REASONS } from "@/config/enums";
import type { ReviewItemDTO } from "@/features/ads/schemas";

import { approveAd, rejectAd } from "../actions";

type Reason = (typeof REJECTION_REASONS)[number];

/** ADM-02: review one pending ad; after an action the page refreshes to the next item (AC2). */
export function ReviewPanel({ item, total }: { item: ReviewItemDTO; total: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [note, setNote] = useState("");

  const done = (message: string) => {
    toast.success(message);
    setOpen(false);
    setReason("");
    setNote("");
    router.refresh();
  };

  const approve = () =>
    start(async () => {
      const res = await approveAd({ id: item.id });
      if (res.ok) done("Approved. The ad is live.");
      else toast.error(res.error.message);
    });

  const reject = () =>
    start(async () => {
      if (!reason) return;
      const res = await rejectAd({ id: item.id, reason, note });
      if (res.ok) done("Rejected. The business can see the reason.");
      else toast.error(res.error.message);
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-black">
        <video
          key={item.videoUrl}
          src={item.videoUrl}
          poster={item.posterUrl ?? undefined}
          className="h-full w-full object-contain"
          controls
          autoPlay
          loop
          playsInline
        />
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <p className="eyebrow">{total} waiting · oldest first</p>
          <h2 className="mt-3 font-display text-lg font-bold">{item.title}</h2>
          {item.isReplacement && (
            <p className="mt-2 text-xs text-warning">
              Replacement video for a live ad. The current version stays live until you decide.
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="eyebrow">Duration</dt>
            <dd className="mt-1.5">{item.durationSec.toFixed(2)} s</dd>
          </div>
          <div>
            <dt className="eyebrow">Aspect</dt>
            <dd className="mt-1.5">{item.aspectRatio}</dd>
          </div>
          <div>
            <dt className="eyebrow">Category</dt>
            <dd className="mt-1.5">{item.category}</dd>
          </div>
          <div>
            <dt className="eyebrow">Tags</dt>
            <dd className="mt-1.5">{item.tags.join(", ") || "—"}</dd>
          </div>
          {item.description && (
            <div className="col-span-2">
              <dt className="eyebrow">Description</dt>
              <dd className="mt-1.5 text-foreground-secondary">{item.description}</dd>
            </div>
          )}
        </dl>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-input">
            {item.business.logoUrl && (
              <Image
                src={item.business.logoUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="40px"
              />
            )}
          </span>
          <div className="min-w-0 text-[13px]">
            <p className="font-bold">{item.business.name}</p>
            <p className="truncate text-subtle-foreground">{item.business.email}</p>
            {item.business.website && (
              <p className="truncate text-subtle-foreground">{item.business.website}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={approve} disabled={pending}>
            {pending ? <Spinner /> : <Check className="size-4" aria-hidden="true" />} Approve
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="default"
                disabled={pending}
                className="h-12 px-5 text-[13px]"
              >
                <X className="size-4" aria-hidden="true" /> Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject this ad</DialogTitle>
                <DialogDescription>
                  The business sees the reason and can edit and resubmit.
                </DialogDescription>
              </DialogHeader>
              <RadioGroup
                value={reason}
                onValueChange={(v) => setReason(v as Reason)}
                aria-label="Reason"
                className="gap-3"
              >
                {REJECTION_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-3 text-[13px]">
                    <RadioGroupItem value={r} /> {r}
                  </label>
                ))}
              </RadioGroup>
              <Field label="Note (optional)">
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                )}
              </Field>
              <DialogFooter>
                <Button
                  variant="destructive"
                  size="default"
                  className="h-11 px-5 text-[13px]"
                  disabled={!reason || pending}
                  onClick={reject}
                >
                  {pending && <Spinner />} Reject ad
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
