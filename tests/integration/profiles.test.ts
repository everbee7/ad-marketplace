import { describe, expect, it } from "vitest";

import { getProfile } from "@/features/profiles/queries";
import { profileSchema } from "@/features/profiles/schemas";
import { saveProfile } from "@/features/profiles/service";
import { imageTarget } from "@/features/uploads/service";
import { headObject, putObject } from "@/lib/storage";

import { createTestUser, isOnboarded } from "../support/users";

const business = (over: Record<string, unknown> = {}) =>
  profileSchema.parse({ role: "business", companyName: "Acme", category: "Food & Drink", ...over });

describe("PRF-01 onboarding", () => {
  it("AC1: saving the required fields completes onboarding", async () => {
    const user = await createTestUser("business");
    expect(await isOnboarded(user.id)).toBe(false);
    await saveProfile(
      user,
      business({ website: "https://acme.example", description: "We sell snacks." }),
    );
    expect(await isOnboarded(user.id)).toBe(true);
    expect(await getProfile(user.id)).toMatchObject({
      role: "business",
      companyName: "Acme",
      website: "https://acme.example",
    });
  });

  it("AC1: required fields are enforced by the shared schema", () => {
    expect(
      profileSchema.safeParse({ role: "business", companyName: "", category: "Food & Drink" })
        .success,
    ).toBe(false);
    expect(profileSchema.safeParse({ role: "creator", displayName: "Jo" }).success).toBe(false);
    expect(
      profileSchema.safeParse({
        role: "creator",
        displayName: "Jo",
        niche: "Gaming",
        bio: "x".repeat(301),
      }).success,
    ).toBe(false);
  });

  it("rejects a profile for the other role", async () => {
    const user = await createTestUser("creator");
    await expect(saveProfile(user, business())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("AC2: accepts only the user's own uploaded image within limits", async () => {
    const user = await createTestUser("business");
    const other = await createTestUser("business");

    const mine = imageTarget(user, "logo", "image/png");
    const stored = await putObject(mine.pathname, Buffer.from("png-bytes"), "image/png");
    await saveProfile(user, business({ logoUrl: stored.url }));
    expect(
      (await getProfile(user.id))?.role === "business" && (await getProfile(user.id)),
    ).toMatchObject({ logoUrl: stored.url });

    await expect(saveProfile(other, business({ logoUrl: stored.url }))).rejects.toMatchObject({
      code: "MEDIA_INVALID",
    });

    const bad = imageTarget(user, "logo", "image/png");
    const pdf = await putObject(bad.pathname, Buffer.from("%PDF"), "application/pdf");
    await expect(saveProfile(user, business({ logoUrl: pdf.url }))).rejects.toMatchObject({
      code: "MEDIA_INVALID",
    });
  });
});

describe("PRF-02 edit profile", () => {
  it("AC1: edits replace the fields and clean up a replaced logo", async () => {
    const user = await createTestUser("creator");
    const first = await putObject(
      imageTarget(user, "avatar", "image/webp").pathname,
      Buffer.from("a"),
      "image/webp",
    );
    await saveProfile(
      user,
      profileSchema.parse({
        role: "creator",
        displayName: "Jo",
        niche: "Gaming",
        avatarUrl: first.url,
      }),
    );
    const second = await putObject(
      imageTarget(user, "avatar", "image/webp").pathname,
      Buffer.from("b"),
      "image/webp",
    );
    await saveProfile(
      { ...user, onboardingCompleted: true },
      profileSchema.parse({
        role: "creator",
        displayName: "Jo B",
        niche: "Gaming",
        avatarUrl: second.url,
        youtube: "https://youtube.com/@jo",
      }),
    );
    expect(await getProfile(user.id)).toMatchObject({
      displayName: "Jo B",
      avatarUrl: second.url,
      youtube: "https://youtube.com/@jo",
    });
    expect(await headObject(first.url)).toBeNull();
  });
});
