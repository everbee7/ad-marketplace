"use server";

import { revalidatePath } from "next/cache";

import { ROLE_HOME } from "@/config/routes";
import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

import { profileSchema, type ProfileInput } from "./schemas";
import { saveProfile } from "./service";

/** PRF-01: first save of the required fields; unlocks the role area. */
export async function completeOnboarding(
  input: ProfileInput,
): Promise<ActionResult<{ redirectTo: string }>> {
  return run("completeOnboarding", profileSchema, input, async (data) => {
    const user = await requireUser({ role: ["business", "creator"], onboarded: false });
    await saveProfile(user, data);
    revalidatePath("/", "layout");
    return { redirectTo: ROLE_HOME[user.role] };
  });
}

/** PRF-02: edit later; changes show on Marketplace cards straight away. */
export async function updateProfile(input: ProfileInput): Promise<ActionResult<null>> {
  return run("updateProfile", profileSchema, input, async (data) => {
    const user = await requireUser({ role: ["business", "creator"] });
    await saveProfile(user, data);
    revalidatePath("/", "layout");
    return null;
  });
}
