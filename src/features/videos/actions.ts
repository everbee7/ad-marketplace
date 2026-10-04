"use server";

import { revalidatePath } from "next/cache";

import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { enforce } from "@/lib/ratelimit";

import {
  finalizeVideoUploadSchema,
  renameVideoSchema,
  startVideoUploadSchema,
  videoIdSchema,
  type FinalizeVideoUploadInput,
  type RenameVideoInput,
  type StartVideoUploadInput,
  type VideoIdInput,
} from "./schemas";
import {
  cancelVideoUpload as cancelService,
  deleteVideo as deleteService,
  finalizeVideoUpload as finalizeService,
  renameVideo as renameService,
  startNewVideoUpload,
  startVideoRetry,
} from "./service";

const creator = () => requireUser({ role: "creator" });
const refresh = () => {
  revalidatePath("/creator", "layout");
};

/** VID-01: reserve storage for a new video, or retry a failed one (AC2). */
export async function startVideoUpload(input: StartVideoUploadInput) {
  return run("startVideoUpload", startVideoUploadSchema, input, async (data) => {
    const user = await creator();
    await enforce("uploads", user.id);
    return data.videoId
      ? startVideoRetry(user, data.videoId, data.file)
      : startNewVideoUpload(user, data.meta!, data.file);
  });
}

/** VID-01 AC2. */
export async function finalizeVideoUpload(
  input: FinalizeVideoUploadInput,
): Promise<ActionResult<{ status: string; errorMessage: string | null }>> {
  return run("finalizeVideoUpload", finalizeVideoUploadSchema, input, async (data) => {
    const res = await finalizeService(await creator(), data.id, data);
    refresh();
    return res;
  });
}

export async function cancelVideoUpload(input: VideoIdInput): Promise<ActionResult<null>> {
  return run("cancelVideoUpload", videoIdSchema, input, async ({ id }) => {
    await cancelService(await creator(), id);
    refresh();
    return null;
  });
}

/** VID-02. */
export async function renameVideo(input: RenameVideoInput): Promise<ActionResult<null>> {
  return run("renameVideo", renameVideoSchema, input, async ({ id, title }) => {
    await renameService(await creator(), id, title);
    refresh();
    return null;
  });
}

/** VID-02 AC1: deletes the video and its projects. */
export async function deleteVideo(
  input: VideoIdInput,
): Promise<ActionResult<{ deletedProjects: number }>> {
  return run("deleteVideo", videoIdSchema, input, async ({ id }) => {
    const res = await deleteService(await creator(), id);
    refresh();
    return res;
  });
}
