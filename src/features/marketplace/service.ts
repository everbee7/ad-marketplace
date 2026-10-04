import "server-only";

import mongoose from "mongoose";

import { connectDb } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/permissions";
import { Ad } from "@/models/ad";
import { SavedAd } from "@/models/saved-ad";
import { toObjectId } from "@/models/shared";

// MKT-04: saving keeps ads.saveCount in sync in the same transaction (CONVENTIONS §Data).

function ids(user: CurrentUser, adId: string) {
  const creatorId = toObjectId(user.id);
  const ad = toObjectId(adId);
  if (!creatorId || !ad) throw new DomainError("NOT_FOUND", "Ad not found.");
  return { creatorId, adId: ad };
}

function isDuplicateKey(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

/** Saves a Marketplace ad. Idempotent. */
export async function saveAd(user: CurrentUser, adIdRaw: string): Promise<void> {
  const { creatorId, adId } = ids(user, adIdRaw);
  await connectDb();
  try {
    await mongoose.connection.transaction(async (session) => {
      const ad = await Ad.findOne({ _id: adId, inMarketplace: true, deletedAt: null }, { _id: 1 })
        .session(session)
        .lean();
      if (!ad) throw new DomainError("NOT_FOUND", "This ad is no longer available.");
      if (await SavedAd.exists({ creatorId, adId }).session(session)) return;
      await SavedAd.create([{ creatorId, adId }], { session });
      await Ad.updateOne({ _id: adId }, { $inc: { saveCount: 1 } }, { session });
    });
  } catch (err) {
    // A concurrent save won the race: a duplicate key aborts our transaction, and the ad is saved.
    if (!isDuplicateKey(err)) throw err;
  }
}

/** Removes an ad from the shortlist, available or not (MKT-05 AC2). Idempotent. */
export async function unsaveAd(user: CurrentUser, adIdRaw: string): Promise<void> {
  const { creatorId, adId } = ids(user, adIdRaw);
  await connectDb();
  await mongoose.connection.transaction(async (session) => {
    const res = await SavedAd.deleteOne({ creatorId, adId }, { session });
    if (res.deletedCount === 1) {
      await Ad.updateOne(
        { _id: adId, saveCount: { $gt: 0 } },
        { $inc: { saveCount: -1 } },
        { session },
      );
    }
  });
}
