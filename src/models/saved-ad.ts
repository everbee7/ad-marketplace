import "server-only";

import { Schema, type Types } from "mongoose";

import { getModel } from "./shared";

// `savedAds` (DATA_MODEL.md): a creator's shortlist (MKT-04/05).

export type SavedAdDoc = {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  adId: Types.ObjectId;
  createdAt: Date;
};

const SavedAdSchema = new Schema<SavedAdDoc>(
  {
    creatorId: { type: Schema.Types.ObjectId, required: true },
    adId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: true },
);

SavedAdSchema.index({ creatorId: 1, adId: 1 }, { unique: true });
SavedAdSchema.index({ creatorId: 1, createdAt: -1 });

export const SavedAd = getModel<SavedAdDoc>("SavedAd", SavedAdSchema, "savedAds");
