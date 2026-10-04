"use server";

import { revalidatePath } from "next/cache";

import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { enforce } from "@/lib/ratelimit";

import { adIdOnlySchema, type AdIdOnlyInput } from "./schemas";
import { saveAd as saveAdService, unsaveAd as unsaveAdService } from "./service";

/** MKT-04 (creator only). */
export async function saveAd(input: AdIdOnlyInput): Promise<ActionResult<{ saved: true }>> {
  return run("saveAd", adIdOnlySchema, input, async ({ adId }) => {
    const user = await requireUser({ role: "creator" });
    await enforce("save", user.id);
    await saveAdService(user, adId);
    revalidatePath("/creator/saved");
    return { saved: true as const };
  });
}

/** MKT-04 / MKT-05 AC2. */
export async function unsaveAd(input: AdIdOnlyInput): Promise<ActionResult<{ saved: false }>> {
  return run("unsaveAd", adIdOnlySchema, input, async ({ adId }) => {
    const user = await requireUser({ role: "creator" });
    await enforce("save", user.id);
    await unsaveAdService(user, adId);
    revalidatePath("/creator/saved");
    return { saved: false as const };
  });
}
