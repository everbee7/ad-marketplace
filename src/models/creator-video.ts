import "server-only";

import { Schema, type Types } from "mongoose";

import { VIDEO_STATUSES, type VideoStatus } from "@/config/enums";

import {
  getModel,
  PendingUploadSchema,
  VideoAssetSchema,
  type PendingUpload,
  type VideoAsset,
} from "./shared";

// `creatorVideos` (DATA_MODEL.md): private to the owner and admins (VID-01 AC3).

export type CreatorVideoDoc = {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  title: string;
  description: string | null;
  status: VideoStatus;
  video: VideoAsset | null;
  pendingUpload: PendingUpload | null;
  errorMessage: string | null;
  hiddenByAdmin: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const CreatorVideoSchema = new Schema<CreatorVideoDoc>(
  {
    creatorId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: { type: String, enum: VIDEO_STATUSES, required: true },
    video: { type: VideoAssetSchema, default: null },
    pendingUpload: { type: PendingUploadSchema, default: null },
    errorMessage: { type: String, default: null },
    hiddenByAdmin: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: true },
);

CreatorVideoSchema.index({ creatorId: 1, createdAt: -1 });
CreatorVideoSchema.index({ status: 1, updatedAt: 1 });
CreatorVideoSchema.index({ title: "text" }, { name: "video_text" });

export const CreatorVideo = getModel<CreatorVideoDoc>(
  "CreatorVideo",
  CreatorVideoSchema,
  "creatorVideos",
);
