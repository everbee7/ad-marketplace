"use server";

import { revalidatePath } from "next/cache";

import {
  adIdSchema,
  rejectAdSchema,
  type AdIdInput,
  type RejectAdInput,
} from "@/features/ads/schemas";
import {
  approveAd as approve,
  rejectAd as reject,
  removeAd as remove,
} from "@/features/ads/service";
import { setVideoHidden } from "@/features/videos/service";
import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

import {
  hideVideoSchema,
  removeAdSchema,
  type HideVideoInput,
  type RemoveAdInput,
} from "./schemas";

const admin = () => requireUser({ role: "admin" });

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/business", "layout");
  revalidatePath("/creator", "layout");
  revalidatePath("/marketplace", "layout");
}

/** ADM-02: pending_review → live, logged (AC1). */
export async function approveAd(input: AdIdInput): Promise<ActionResult<null>> {
  return run("approveAd", adIdSchema, input, async ({ id }) => {
    await approve(await admin(), id);
    refresh();
    return null;
  });
}

/** ADM-02: pending_review → rejected with a preset reason plus optional note, logged (AC1). */
export async function rejectAd(input: RejectAdInput): Promise<ActionResult<null>> {
  return run("rejectAd", rejectAdSchema, input, async ({ id, reason, note }) => {
    await reject(await admin(), id, note ? `${reason}: ${note}` : reason);
    refresh();
    return null;
  });
}

/** ADM-03: live → removed (terminal), reason required, logged. */
export async function removeAd(input: RemoveAdInput): Promise<ActionResult<null>> {
  return run("removeAd", removeAdSchema, input, async ({ id, reason }) => {
    await remove(await admin(), id, reason);
    refresh();
    return null;
  });
}

/** ADM-03: hide a creator video (AC1: only admins can play it). */
export async function hideVideo(input: HideVideoInput): Promise<ActionResult<null>> {
  return run("hideVideo", hideVideoSchema, input, async ({ id, reason }) => {
    await setVideoHidden(await admin(), id, true, reason);
    refresh();
    return null;
  });
}

export async function unhideVideo(input: HideVideoInput): Promise<ActionResult<null>> {
  return run("unhideVideo", hideVideoSchema, input, async ({ id, reason }) => {
    await setVideoHidden(await admin(), id, false, reason);
    refresh();
    return null;
  });
}
