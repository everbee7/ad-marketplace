"use server";

import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { enforce } from "@/lib/ratelimit";

import { imageUploadSchema, type ImageUploadInput, type UploadTargetDTO } from "./schemas";
import { imageTarget } from "./service";

/** PRF-01 AC2 / AD-01 AC4: reserve a pathname for a logo, avatar or custom thumbnail. */
export async function startImageUpload(
  input: ImageUploadInput,
): Promise<ActionResult<UploadTargetDTO>> {
  return run("startImageUpload", imageUploadSchema, input, async (data) => {
    // Onboarding uploads logos/avatars before the profile exists.
    const user = await requireUser({ role: ["business", "creator"], onboarded: false });
    await enforce("uploads", user.id);
    return imageTarget(user, data.kind, data.contentType);
  });
}
