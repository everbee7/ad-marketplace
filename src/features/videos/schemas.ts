import { z } from "zod";

import type { VideoStatus } from "@/config/enums";
import { limits } from "@/config/limits";
import { fileMetaSchema, objectIdSchema } from "@/features/ads/schemas";

// VID-01 / VID-02 inputs and DTOs.

const t = limits.text;

export const videoMetaSchema = z.object({
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
});
export type VideoMetaInput = z.input<typeof videoMetaSchema>;

export const startVideoUploadSchema = z.union([
  z.object({ videoId: z.undefined().optional(), meta: videoMetaSchema, file: fileMetaSchema }),
  z.object({ videoId: objectIdSchema, meta: z.undefined().optional(), file: fileMetaSchema }),
]);
export type StartVideoUploadInput = z.input<typeof startVideoUploadSchema>;

export const finalizeVideoUploadSchema = z.object({
  id: objectIdSchema,
  videoUrl: z.string().min(1).max(1000),
  posterUrl: z.string().min(1).max(1000),
});
export type FinalizeVideoUploadInput = z.input<typeof finalizeVideoUploadSchema>;

export const videoIdSchema = z.object({ id: objectIdSchema });
export type VideoIdInput = z.input<typeof videoIdSchema>;

export const renameVideoSchema = z.object({
  id: objectIdSchema,
  title: videoMetaSchema.shape.title,
});
export type RenameVideoInput = z.input<typeof renameVideoSchema>;

export type CreatorVideoDTO = {
  id: string;
  title: string;
  description: string | null;
  status: VideoStatus;
  posterUrl: string | null;
  durationSec: number | null;
  aspectRatio: "vertical" | "horizontal" | "square" | null;
  projectCount: number;
  createdAt: string;
  errorMessage: string | null;
  hidden: boolean;
};

export type CreatorVideoDetailDTO = CreatorVideoDTO & {
  url: string | null;
  width: number | null;
  height: number | null;
};

export const VIDEO_HINT = `MP4, MOV (H.264) or WebM, up to 15 minutes and 2 GB. Files under ${
  limits.creatorVideo.recommendedMaxSizeBytes / 1024 / 1024
} MB upload fastest.`;
