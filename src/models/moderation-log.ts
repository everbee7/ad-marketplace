import "server-only";

import { Schema, type Types } from "mongoose";

import {
  MODERATION_ACTIONS,
  MODERATION_TARGETS,
  type ModerationAction,
  type ModerationTarget,
} from "@/config/enums";

import { getModel } from "./shared";

// `moderationLogs` (DATA_MODEL.md): append-only, never updated (ADM-02 AC1).

export type ModerationLogDoc = {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  targetType: ModerationTarget;
  targetId: Types.ObjectId;
  action: ModerationAction;
  reason: string | null;
  createdAt: Date;
};

const ModerationLogSchema = new Schema<ModerationLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: MODERATION_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: MODERATION_ACTIONS, required: true },
    reason: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: true },
);

ModerationLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const ModerationLog = getModel<ModerationLogDoc>(
  "ModerationLog",
  ModerationLogSchema,
  "moderationLogs",
);
