import { z } from "zod";

import { CATEGORIES } from "@/config/categories";
import { AD_STATUSES, REJECTION_REASONS, type AdStatus } from "@/config/enums";
import { limits } from "@/config/limits";

// AD-01..07 inputs and DTOs.

const t = limits.text;

export const tagsSchema = z
  .array(
    z.string().trim().toLowerCase().max(t.tagMax, `Tags can be at most ${t.tagMax} characters.`),
  )
  .transform((tags) => [...new Set(tags.filter(Boolean))])
  .refine((tags) => tags.length <= t.tagsMax, `Use at most ${t.tagsMax} tags.`);

export const adMetaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(t.titleMin, `Title needs at least ${t.titleMin} characters.`)
    .max(t.titleMax, `Title can be at most ${t.titleMax} characters.`),
  description: z
    .string()
    .trim()
    .max(t.descriptionMax, `Description can be at most ${t.descriptionMax} characters.`)
    .optional()
    .nullable()
    .transform((v) => v || null),
  category: z.enum(CATEGORIES, { message: "Choose a category." }),
  tags: tagsSchema.default([]),
  customThumbnailUrl: z
    .string()
    .max(1000)
    .nullable()
    .optional()
    .transform((v) => v || null),
});
export type AdMetaInput = z.input<typeof adMetaSchema>;

/** Client-reported file facts; the server re-verifies codec and duration for ads. */
export const fileMetaSchema = z.object({
  name: z.string().max(300),
  size: z.number().int().positive(),
  type: z.string().max(100),
  durationSec: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  codec: z.string().max(40),
});
export type FileMeta = z.infer<typeof fileMetaSchema>;

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.");

export const startAdUploadSchema = z.union([
  z.object({ adId: z.undefined().optional(), meta: adMetaSchema, file: fileMetaSchema }),
  z.object({ adId: objectIdSchema, meta: z.undefined().optional(), file: fileMetaSchema }),
]);
export type StartAdUploadInput = z.input<typeof startAdUploadSchema>;

export const finalizeAdUploadSchema = z.object({
  id: objectIdSchema,
  videoUrl: z.string().min(1).max(1000),
  posterUrl: z.string().min(1).max(1000),
});
export type FinalizeAdUploadInput = z.input<typeof finalizeAdUploadSchema>;

export const adIdSchema = z.object({ id: objectIdSchema });
export type AdIdInput = z.input<typeof adIdSchema>;

export const updateAdSchema = adMetaSchema.extend({ id: objectIdSchema });
export type UpdateAdInput = z.input<typeof updateAdSchema>;

export const rejectAdSchema = z.object({
  id: objectIdSchema,
  reason: z.enum(REJECTION_REASONS, { message: "Choose a reason." }),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
});
export type RejectAdInput = z.input<typeof rejectAdSchema>;

export const statusFilterSchema = z.enum(AD_STATUSES).optional().catch(undefined);

// --- DTOs -----------------------------------------------------------------------------------

export type UploadTarget = { driver: "local" | "blob"; pathname: string; uploadKey: string };
export type AdUploadStartDTO = { id: string; video: UploadTarget; poster: UploadTarget };
export type AdUploadResultDTO = { id: string; status: AdStatus; errorMessage: string | null };

export type BusinessAdDTO = {
  id: string;
  title: string;
  status: AdStatus;
  category: string;
  posterUrl: string | null;
  durationSec: number | null;
  aspectRatio: "vertical" | "horizontal" | "square" | null;
  saveCount: number;
  projectCount: number;
  createdAt: string;
  hasPendingVideo: boolean;
  errorMessage: string | null;
};

export type AdDetailDTO = BusinessAdDTO & {
  description: string | null;
  tags: string[];
  videoUrl: string | null;
  pendingVideoUrl: string | null;
  customThumbnailUrl: string | null;
  rejectionReason: string | null;
  removalReason: string | null;
  inMarketplace: boolean;
  statusHistory: { status: AdStatus; at: string; reason: string | null }[];
};

export type ReviewItemDTO = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  videoUrl: string;
  posterUrl: string | null;
  durationSec: number;
  aspectRatio: "vertical" | "horizontal" | "square";
  isReplacement: boolean;
  submittedAt: string | null;
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    email: string | null;
    website: string | null;
  };
};
