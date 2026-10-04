// PRD §10 Business Rules & Limits. Single source in code; must match the PRD table.

const MB = 1024 * 1024;

export const limits = {
  ad: {
    minDurationSec: 0.5,
    maxDurationSec: 2.0,
    durationToleranceSec: 0.05,
    maxSizeBytes: 50 * MB,
    containers: ["video/mp4", "video/quicktime"],
    codecs: ["avc1"],
  },
  creatorVideo: {
    maxDurationSec: 15 * 60,
    maxSizeBytes: 2 * 1024 * MB,
    recommendedMaxSizeBytes: 500 * MB,
    containers: ["video/mp4", "video/quicktime", "video/webm"],
    codecs: ["avc1", "vp8", "vp09", "vp9", "av01"],
  },
  image: {
    maxSizeBytes: 5 * MB,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  project: {
    maxBursts: 10,
    minBurstSpacingSec: 1.0,
    timestampPrecisionSec: 0.1,
  },
  marketplace: {
    pageSize: 24,
  },
  rate: {
    loginFailures: { max: 5, windowSec: 15 * 60 },
    uploads: { max: 20, windowSec: 60 * 60 },
    uploadToken: { max: 60, windowSec: 60 * 60 },
    marketplace: { max: 120, windowSec: 60 },
    save: { max: 120, windowSec: 60 },
    clientError: { max: 30, windowSec: 60 },
    // Not in PRD §10: abuse guard for "resend verification" / "forgot password" emails.
    authEmail: { max: 5, windowSec: 60 * 60 },
  },
  text: {
    titleMin: 3,
    titleMax: 100,
    descriptionMax: 1000,
    shortDescriptionMax: 300,
    tagsMax: 10,
    tagMax: 30,
  },
  auth: {
    passwordMin: 8,
    verificationTtlSec: 24 * 60 * 60,
    resetTtlSec: 60 * 60,
  },
  cleanup: {
    stuckUploadHours: 24,
    deletedGraceDays: 7,
  },
} as const;

export const HEVC_CODECS = ["hvc1", "hev1"] as const;
