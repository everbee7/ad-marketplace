import "server-only";

import { Schema, type Types } from "mongoose";

import { CATEGORIES } from "@/config/categories";
import { AD_STATUSES, type AdStatus } from "@/config/enums";

import {
  getModel,
  PendingUploadSchema,
  VideoAssetSchema,
  type PendingUpload,
  type VideoAsset,
} from "./shared";

// `ads` (DATA_MODEL.md). Status changes only through features/ads/service.ts (PRD §9.1, ADR-0006).

export type StatusHistoryEntry = { status: AdStatus; at: Date; reason: string | null };

export type AdDoc = {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  businessName: string;
  businessLogoUrl: string | null;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  status: AdStatus;
  inMarketplace: boolean;
  rejectionReason: string | null;
  /** Why the last upload failed (AD-02 AC1). */
  errorMessage: string | null;
  removalReason: string | null;
  video: VideoAsset | null;
  pendingVideo: VideoAsset | null;
  pendingUpload: PendingUpload | null;
  customThumbnailUrl: string | null;
  saveCount: number;
  projectCount: number;
  statusHistory: StatusHistoryEntry[];
  submittedAt: Date | null;
  approvedAt: Date | null;
  removedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const AdSchema = new Schema<AdDoc>(
  {
    businessId: { type: Schema.Types.ObjectId, required: true },
    businessName: { type: String, required: true },
    businessLogoUrl: { type: String, default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    category: { type: String, enum: CATEGORIES, required: true },
    tags: { type: [String], default: [] },
    status: { type: String, enum: AD_STATUSES, required: true },
    inMarketplace: { type: Boolean, default: false },
    rejectionReason: { type: String, default: null },
    errorMessage: { type: String, default: null },
    removalReason: { type: String, default: null },
    video: { type: VideoAssetSchema, default: null },
    pendingVideo: { type: VideoAssetSchema, default: null },
    pendingUpload: { type: PendingUploadSchema, default: null },
    customThumbnailUrl: { type: String, default: null },
    saveCount: { type: Number, default: 0 },
    projectCount: { type: Number, default: 0 },
    statusHistory: {
      type: [
        new Schema<StatusHistoryEntry>(
          {
            status: { type: String, enum: AD_STATUSES, required: true },
            at: { type: Date, required: true },
            reason: { type: String, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    removedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: true },
);

AdSchema.index({ inMarketplace: 1, createdAt: -1, _id: -1 });
AdSchema.index({ inMarketplace: 1, category: 1, createdAt: -1 });
AdSchema.index({ inMarketplace: 1, saveCount: -1, _id: -1 });
AdSchema.index({ inMarketplace: 1, projectCount: -1, _id: -1 });
AdSchema.index({ businessId: 1, createdAt: -1 });
AdSchema.index({ status: 1, submittedAt: 1 });
AdSchema.index({ status: 1, updatedAt: 1 });
AdSchema.index(
  { title: "text", description: "text", tags: "text", businessName: "text" },
  { weights: { title: 5, tags: 3, businessName: 2, description: 1 }, name: "ad_text" },
);

export const Ad = getModel<AdDoc>("Ad", AdSchema, "ads");
