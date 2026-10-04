import "server-only";

import { Schema, type Types } from "mongoose";

import { CATEGORIES } from "@/config/categories";
import { SIGNUP_ROLES, type SignupRole } from "@/config/enums";

import { getModel } from "./shared";

// `profiles` (DATA_MODEL.md): one per business or creator user.

export type BusinessProfile = {
  companyName: string;
  logoUrl: string | null;
  website: string | null;
  category: string;
  description: string | null;
};

export type CreatorProfile = {
  displayName: string;
  avatarUrl: string | null;
  niche: string;
  bio: string | null;
  socialLinks: {
    youtube: string | null;
    tiktok: string | null;
    instagram: string | null;
    other: string | null;
  };
};

export type ProfileDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  role: SignupRole;
  business: BusinessProfile | null;
  creator: CreatorProfile | null;
  createdAt: Date;
  updatedAt: Date;
};

const BusinessSchema = new Schema<BusinessProfile>(
  {
    companyName: { type: String, required: true, trim: true },
    logoUrl: { type: String, default: null },
    website: { type: String, default: null },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, default: null },
  },
  { _id: false },
);

const CreatorSchema = new Schema<CreatorProfile>(
  {
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    niche: { type: String, enum: CATEGORIES, required: true },
    bio: { type: String, default: null },
    socialLinks: {
      youtube: { type: String, default: null },
      tiktok: { type: String, default: null },
      instagram: { type: String, default: null },
      other: { type: String, default: null },
    },
  },
  { _id: false },
);

const ProfileSchema = new Schema<ProfileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    role: { type: String, enum: SIGNUP_ROLES, required: true },
    business: { type: BusinessSchema, default: null },
    creator: { type: CreatorSchema, default: null },
  },
  { timestamps: true, strict: true },
);

ProfileSchema.index({ "business.companyName": "text" });

export const Profile = getModel<ProfileDoc>("Profile", ProfileSchema, "profiles");
