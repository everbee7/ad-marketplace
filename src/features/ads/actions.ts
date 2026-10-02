"use server";

import { revalidatePath } from "next/cache";

import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { enforce } from "@/lib/ratelimit";

import {
  adIdSchema,
  finalizeAdUploadSchema,
  startAdUploadSchema,
  updateAdSchema,
  type AdIdInput,
  type AdUploadResultDTO,
  type AdUploadStartDTO,
  type FinalizeAdUploadInput,
  type StartAdUploadInput,
  type UpdateAdInput,
} from "./schemas";
import {
  cancelAdUpload as cancelAdUploadService,
  deleteAd as deleteAdService,
  finalizeAdUpload as finalizeAdUploadService,
  relistAd as relistAdService,
  resubmitAd as resubmitAdService,
  startNewAdUpload,
  startReplaceUpload,
  unlistAd as unlistAdService,
  updateAdMeta,
} from "./service";

const business = () => requireUser({ role: "business" });

function refresh(id?: string) {
  revalidatePath("/business");
  if (id) revalidatePath(`/business/ads/${id}`);
}

/** AD-01 / AD-02 / AD-05: reserve storage paths for a new ad or a replacement video. */
export async function startAdUpload(
  input: StartAdUploadInput,
): Promise<ActionResult<AdUploadStartDTO>> {
  return run("startAdUpload", startAdUploadSchema, input, async (data) => {
    const user = await business();
    await enforce("uploads", user.id);
    return data.adId
      ? startReplaceUpload(user, data.adId, data.file)
      : startNewAdUpload(user, data.meta!, data.file);
  });
}

/** AD-01 AC3/AC5: server re-verification, then In review or Failed. */
export async function finalizeAdUpload(
  input: FinalizeAdUploadInput,
): Promise<ActionResult<AdUploadResultDTO>> {
  return run("finalizeAdUpload", finalizeAdUploadSchema, input, async (data) => {
    const user = await business();
    const res = await finalizeAdUploadService(user, data.id, data);
    refresh(data.id);
    return res;
  });
}

/** AD-01 AC2. */
export async function cancelAdUpload(input: AdIdInput): Promise<ActionResult<null>> {
  return run("cancelAdUpload", adIdSchema, input, async ({ id }) => {
    await cancelAdUploadService(await business(), id);
    refresh(id);
    return null;
  });
}

/** AD-05. */
export async function updateAd(input: UpdateAdInput): Promise<ActionResult<null>> {
  return run("updateAd", updateAdSchema, input, async ({ id, ...meta }) => {
    await updateAdMeta(await business(), id, meta);
    refresh(id);
    return null;
  });
}

/** AD-05 AC3. */
export async function resubmitAd(input: AdIdInput): Promise<ActionResult<null>> {
  return run("resubmitAd", adIdSchema, input, async ({ id }) => {
    await resubmitAdService(await business(), id);
    refresh(id);
    return null;
  });
}

/** AD-06 AC1. */
export async function unlistAd(input: AdIdInput): Promise<ActionResult<null>> {
  return run("unlistAd", adIdSchema, input, async ({ id }) => {
    await unlistAdService(await business(), id);
    refresh(id);
    return null;
  });
}

/** AD-06 AC2. */
export async function relistAd(input: AdIdInput): Promise<ActionResult<{ status: string }>> {
  return run("relistAd", adIdSchema, input, async ({ id }) => {
    const status = await relistAdService(await business(), id);
    refresh(id);
    return { status };
  });
}

/** AD-07. */
export async function deleteAd(input: AdIdInput): Promise<ActionResult<null>> {
  return run("deleteAd", adIdSchema, input, async ({ id }) => {
    await deleteAdService(await business(), id);
    refresh();
    return null;
  });
}
