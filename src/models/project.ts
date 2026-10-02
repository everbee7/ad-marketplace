import "server-only";

import { Schema, type Types } from "mongoose";

import { PROJECT_STATUSES, type ProjectStatus } from "@/config/enums";

import { getModel } from "./shared";

// `projects` (DATA_MODEL.md). Invariants live in features/projects/service.ts.

export type BurstDoc = { id: string; adId: Types.ObjectId; atSec: number };

export type ProjectDoc = {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  name: string;
  creatorVideoId: Types.ObjectId;
  bursts: BurstDoc[];
  status: ProjectStatus;
  revision: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const BurstSchema = new Schema<BurstDoc>(
  {
    id: { type: String, required: true },
    adId: { type: Schema.Types.ObjectId, required: true },
    atSec: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const ProjectSchema = new Schema<ProjectDoc>(
  {
    creatorId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    creatorVideoId: { type: Schema.Types.ObjectId, required: true },
    bursts: { type: [BurstSchema], default: [] },
    status: { type: String, enum: PROJECT_STATUSES, default: "draft" },
    revision: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: true },
);

ProjectSchema.index({ creatorId: 1, updatedAt: -1 });
ProjectSchema.index({ creatorVideoId: 1 });
ProjectSchema.index({ "bursts.adId": 1 });

export const Project = getModel<ProjectDoc>("Project", ProjectSchema, "projects");
