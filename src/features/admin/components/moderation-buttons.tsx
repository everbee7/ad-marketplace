"use client";

import { Ban, Eye, EyeOff } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { hideVideo, removeAd, unhideVideo } from "../actions";

/** ADM-03: Remove (reason required). Only live ads can be removed (PRD §9.1). */
export function RemoveAdButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        size="xs"
        variant="destructive"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${title}`}
      >
        <Ban className="size-3" aria-hidden="true" /> Remove
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove “{title}”</DialogTitle>
            <DialogDescription>
              The ad leaves the Marketplace for good. The business sees your reason.
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason" required>
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
          <DialogFooter>
            <Button
              variant="destructive"
              className="h-11 px-5 text-[13px]"
              disabled={pending || reason.trim().length < 3}
              onClick={() =>
                start(async () => {
                  const res = await removeAd({ id, reason });
                  if (!res.ok) return void toast.error(res.error.message);
                  toast.success("Ad removed");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Remove ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** ADM-03: Hide / Unhide a creator video. */
export function HideVideoButton({
  id,
  title,
  hidden,
}: {
  id: string;
  title: string;
  hidden: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="xs"
      variant={hidden ? "outline" : "destructive"}
      disabled={pending}
      aria-label={`${hidden ? "Unhide" : "Hide"} ${title}`}
      onClick={() =>
        start(async () => {
          const res = hidden ? await unhideVideo({ id }) : await hideVideo({ id });
          if (!res.ok) return void toast.error(res.error.message);
          toast.success(hidden ? "Video visible again" : "Video hidden");
          router.refresh();
        })
      }
    >
      {hidden ? (
        <Eye className="size-3" aria-hidden="true" />
      ) : (
        <EyeOff className="size-3" aria-hidden="true" />
      )}
      {hidden ? "Unhide" : "Hide"}
    </Button>
  );
}
