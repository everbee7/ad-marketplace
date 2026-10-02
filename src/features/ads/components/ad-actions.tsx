"use client";

import { EyeOff, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/errors";

import { deleteAd, relistAd, resubmitAd, unlistAd } from "../actions";
import type { AdDetailDTO } from "../schemas";

/** AD-05 / AD-06 / AD-07 actions, shown according to the current status. */
export function AdActions({ ad }: { ad: AdDetailDTO }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<ActionResult<unknown>>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(success);
      if (after) after();
      else router.refresh();
    });

  const editable = ad.status !== "removed" && ad.status !== "uploading";
  return (
    <div className="flex flex-wrap gap-2">
      {pending && <Spinner />}
      {editable && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/business/ads/${ad.id}/edit`}>
            <Pencil className="size-3.5" aria-hidden="true" /> Edit
          </Link>
        </Button>
      )}
      {ad.status === "rejected" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => act(() => resubmitAd({ id: ad.id }), "Sent for review")}
        >
          <Send className="size-3.5" aria-hidden="true" /> Resubmit
        </Button>
      )}
      {ad.status === "live" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => act(() => unlistAd({ id: ad.id }), "Ad unlisted")}
        >
          <EyeOff className="size-3.5" aria-hidden="true" /> Unlist
        </Button>
      )}
      {ad.status === "unlisted" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => act(() => relistAd({ id: ad.id }), "Ad relisted")}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" /> Relist
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={pending}>
            <Trash2 className="size-3.5" aria-hidden="true" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ad?</AlertDialogTitle>
            <AlertDialogDescription>
              {ad.projectCount > 0
                ? `${ad.projectCount} ${ad.projectCount === 1 ? "project uses" : "projects use"} this ad. Creators will see those bursts as Unavailable.`
                : "No projects use this ad."}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep ad</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                act(
                  () => deleteAd({ id: ad.id }),
                  "Ad deleted",
                  () => {
                    router.push("/business");
                    router.refresh();
                  },
                )
              }
            >
              Delete ad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
