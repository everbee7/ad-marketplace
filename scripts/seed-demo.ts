// `npm run seed:demo`: a demo business with approved burst ads (and the admin who approved them),
// created through the real services so every invariant holds. Safe to re-run: skips if present.

import { readFileSync } from "node:fs";
import path from "node:path";

import { adMetaSchema } from "@/features/ads/schemas";
import { approveAd, finalizeAdUpload, startNewAdUpload } from "@/features/ads/service";
import { profileSchema } from "@/features/profiles/schemas";
import { saveProfile } from "@/features/profiles/service";
import { auth } from "@/lib/auth";
import { disconnectDb } from "@/lib/db";
import type { CurrentUser } from "@/lib/permissions";
import { putObject } from "@/lib/storage";

import { FIXTURE_DIR, makeFixtures, posterName } from "./make-fixtures";
import { seedAdmin } from "./seed-admin";

export const DEMO_BUSINESS = {
  email: "demo-business@flashd.local",
  password: "demopass1",
  name: "Demo Snacks Co",
};
export const DEMO_ADS = [
  {
    title: "Crunchy Chips Burst",
    category: "Food & Drink",
    tags: ["snacks", "crunchy"],
    fixture: "ad-1s-vertical.mp4",
  },
  {
    title: "Sunrise Coffee Flash",
    category: "Food & Drink",
    tags: ["coffee", "morning"],
    fixture: "ad-1.5s-horizontal.mp4",
  },
  {
    title: "Pixel Arena Teaser",
    category: "Gaming",
    tags: ["games", "arena"],
    fixture: "ad-0.8s-square.mp4",
  },
  {
    title: "Budget App Blink",
    category: "Finance",
    tags: ["savings", "app"],
    fixture: "ad-1.5s-horizontal.mp4",
  },
] as const;

async function ensureUser(email: string, password: string, role: "business" | "creator") {
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) return { id: existing.user.id, created: false };
  const user = await ctx.internalAdapter.createUser(
    { email, name: role, emailVerified: true, role, onboardingCompleted: false },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  return { id: user.id, created: true };
}

export async function seedDemo(adminEmail = "admin@flashd.local", adminPassword = "adminpass1") {
  makeFixtures();
  const adminId = await seedAdmin(adminEmail, adminPassword);
  const admin: CurrentUser = {
    id: adminId,
    email: adminEmail,
    name: "Admin",
    role: "admin",
    emailVerified: true,
    onboardingCompleted: true,
  };

  const { id, created } = await ensureUser(DEMO_BUSINESS.email, DEMO_BUSINESS.password, "business");
  if (!created) return { businessId: id, ads: 0 };
  const business: CurrentUser = {
    id,
    email: DEMO_BUSINESS.email,
    name: DEMO_BUSINESS.name,
    role: "business",
    emailVerified: true,
    onboardingCompleted: false,
  };
  await saveProfile(
    business,
    profileSchema.parse({
      role: "business",
      companyName: DEMO_BUSINESS.name,
      category: "Food & Drink",
      website: "https://example.com",
      description: "Snacks for creators who move fast.",
    }),
  );
  const onboarded = { ...business, onboardingCompleted: true };

  for (const ad of DEMO_ADS) {
    const bytes = readFileSync(path.join(FIXTURE_DIR, ad.fixture));
    const start = await startNewAdUpload(
      onboarded,
      adMetaSchema.parse({ title: ad.title, category: ad.category, tags: [...ad.tags] }),
      {
        name: ad.fixture,
        size: bytes.length,
        type: "video/mp4",
        durationSec: 1,
        width: 360,
        height: 640,
        codec: "avc1",
      },
    );
    const video = await putObject(start.video.pathname, bytes, "video/mp4");
    const jpeg = readFileSync(path.join(FIXTURE_DIR, posterName(ad.fixture)));
    const poster = await putObject(start.poster.pathname, jpeg, "image/jpeg");
    await finalizeAdUpload(onboarded, start.id, { videoUrl: video.url, posterUrl: poster.url });
    await approveAd(admin, start.id);
  }
  return { businessId: id, ads: DEMO_ADS.length };
}

const invokedDirectly = process.argv[1] && /seed-demo\.[tj]s$/.test(process.argv[1]);
if (invokedDirectly) {
  const [adminEmail, adminPassword] = process.argv.slice(2);
  seedDemo(adminEmail, adminPassword)
    .then((r) => console.info(`Demo data ready: ${r.ads} new ads for ${DEMO_BUSINESS.email}`))
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => void disconnectDb());
}
