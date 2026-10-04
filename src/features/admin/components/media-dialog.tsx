"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** ADM-03 AC1: admins can still play removed and hidden content. */
export function MediaDialog({ url, title }: { url: string | null; title: string }) {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  return (
    <>
      <Button
        size="xs"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={`Play ${title}`}
      >
        <Play className="size-3" aria-hidden="true" /> Play
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {open && (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-md bg-black object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
