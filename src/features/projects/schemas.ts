import { z } from "zod";

import type { ProjectStatus } from "@/config/enums";
import { limits } from "@/config/limits";
import { objectIdSchema } from "@/features/ads/schemas";

// PRJ-01..07 inputs and DTOs (API.md ProjectEditorDTO).

const t = limits.text;

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Give the project a name.")
  .max(t.titleMax, `Names can be at most ${t.titleMax} characters.`);

export const burstInputSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{6,32}$/, "Invalid burst id."),
  adId: objectIdSchema,
  atSec: z.number().min(0).max(limits.creatorVideo.maxDurationSec),
});
export type BurstInput = z.infer<typeof burstInputSchema>;

export const createProjectSchema = z.object({
  videoId: objectIdSchema,
  adId: objectIdSchema.optional(),
});
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateBurstsSchema = z.object({
  id: objectIdSchema,
  revision: z.number().int().min(0),
  bursts: z.array(burstInputSchema).max(limits.project.maxBursts),
});
export type UpdateBurstsInput = z.input<typeof updateBurstsSchema>;

export const saveProjectSchema = z.object({
  id: objectIdSchema,
  revision: z.number().int().min(0),
});
export type SaveProjectInput = z.input<typeof saveProjectSchema>;

export const projectIdSchema = z.object({ id: objectIdSchema });
export type ProjectIdInput = z.input<typeof projectIdSchema>;

export const renameProjectSchema = z.object({ id: objectIdSchema, name: projectNameSchema });
export type RenameProjectInput = z.input<typeof renameProjectSchema>;

export type ProjectAdDTO = {
  id: string;
  title: string;
  url: string | null;
  posterUrl: string | null;
  durationSec: number;
  aspectRatio: "vertical" | "horizontal" | "square";
  available: boolean;
};

export type ProjectEditorDTO = {
  id: string;
  name: string;
  revision: number;
  status: ProjectStatus;
  updatedAt: string;
  video: {
    id: string;
    title: string;
    url: string;
    posterUrl: string | null;
    durationSec: number;
    aspectRatio: "vertical" | "horizontal" | "square";
  };
  bursts: { id: string; atSec: number; ad: ProjectAdDTO }[];
};

export type ProjectListItemDTO = {
  id: string;
  name: string;
  videoTitle: string;
  posterUrl: string | null;
  burstCount: number;
  unavailableCount: number;
  status: ProjectStatus;
  updatedAt: string;
};

export type SaveResultDTO = { revision: number; status: ProjectStatus; updatedAt: string };
