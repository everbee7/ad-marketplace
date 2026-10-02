import "server-only";

import mongoose, { Schema, type Model } from "mongoose";

// Shared schema pieces (DATA_MODEL.md). Models are cached on mongoose.models for dev hot reloads.

export function getModel<T>(name: string, schema: Schema<T>, collection: string): Model<T> {
  return (
    (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema, collection)
  );
}

export type VideoAsset = {
  url: string;
  pathname: string;
  posterUrl: string | null;
  posterPathname: string | null;
  sizeBytes: number;
  contentType: string;
  codec: string;
  durationSec: number;
  width: number;
  height: number;
  aspectRatio: "vertical" | "horizontal" | "square";
  errorMessage: string | null;
};

export const VideoAssetSchema = new Schema<VideoAsset>(
  {
    url: { type: String, required: true },
    pathname: { type: String, required: true },
    posterUrl: { type: String, default: null },
    posterPathname: { type: String, default: null },
    sizeBytes: { type: Number, required: true },
    contentType: { type: String, required: true },
    codec: { type: String, required: true },
    durationSec: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    aspectRatio: { type: String, enum: ["vertical", "horizontal", "square"], required: true },
    errorMessage: { type: String, default: null },
  },
  { _id: false },
);

/** Pathnames reserved by startUpload; the token route only accepts these (ARCHITECTURE §7.2). */
export type PendingUpload = {
  videoPath: string;
  posterPath: string;
  startedAt: Date;
};

export const PendingUploadSchema = new Schema<PendingUpload>(
  {
    videoPath: { type: String, required: true },
    posterPath: { type: String, required: true },
    startedAt: { type: Date, required: true },
  },
  { _id: false },
);

export function aspectRatioOf(width: number, height: number): VideoAsset["aspectRatio"] {
  const r = width / height;
  if (r > 1.1) return "horizontal";
  if (r < 0.9) return "vertical";
  return "square";
}

export const { ObjectId } = Schema.Types;

export function toObjectId(id: string): mongoose.Types.ObjectId | null {
  return mongoose.isValidObjectId(id) && /^[a-f0-9]{24}$/i.test(id)
    ? new mongoose.Types.ObjectId(id)
    : null;
}
