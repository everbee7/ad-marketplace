// Enumerations from PRD §9 and DATA_MODEL.md. Never inline these literals elsewhere.

export const ROLES = ["business", "creator", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const SIGNUP_ROLES = ["business", "creator"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const AD_STATUSES = [
  "uploading",
  "failed",
  "pending_review",
  "live",
  "unlisted",
  "rejected",
  "removed",
] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export const VIDEO_STATUSES = ["uploading", "ready", "failed"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const PROJECT_STATUSES = ["draft", "saved"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const MODERATION_ACTIONS = [
  "approve",
  "reject",
  "remove",
  "hide",
  "unhide",
  "resubmit",
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const MODERATION_TARGETS = ["ad", "creatorVideo", "user"] as const;
export type ModerationTarget = (typeof MODERATION_TARGETS)[number];

export const REJECTION_REASONS = [
  "Inappropriate",
  "Poor quality",
  "Misleading",
  "Wrong length",
  "Other",
] as const;

export const UPLOAD_KINDS = ["ad", "creatorVideo"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const IMAGE_KINDS = ["logo", "avatar", "thumbnail"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const DURATION_BANDS = {
  short: { label: "0.5–1.0 s", min: 0.5, max: 1.0 },
  medium: { label: "1.0–1.5 s", min: 1.0, max: 1.5 },
  long: { label: "1.5–2.0 s", min: 1.5, max: 2.0 },
} as const;
export type DurationBand = keyof typeof DURATION_BANDS;

export const ASPECT_RATIOS = ["vertical", "horizontal", "square"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const MARKETPLACE_SORTS = ["newest", "most_saved", "most_used"] as const;
export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number];
