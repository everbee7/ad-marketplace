"use server";

import { revalidatePath } from "next/cache";

import {
  adIdSchema,
  rejectAdSchema,
  type AdIdInput,
  type RejectAdInput,
} from "@/features/ads/schemas";
import { approveAd as approve, rejectAd as reject } from "@/features/ads/service";
import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

const admin = () => requireUser({ role: "admin" });

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/business", "layout");
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
