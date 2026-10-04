import { z } from "zod";

import { AD_STATUSES, ROLES, type AdStatus, type Role, type VideoStatus } from "@/config/enums";
import { objectIdSchema } from "@/features/ads/schemas";

// ADM-01/03/04 inputs and DTOs.

export const ADMIN_PAGE_SIZE = 25;

const page = z.coerce.number().int().min(1).max(1000).default(1).catch(1);
const query = z
  .string()
  .trim()
  .max(100)
  .optional()
  .catch(undefined)
  .transform((v) => v || undefined);

export const adminAdsQuerySchema = z.object({
  q: query,
  status: z
    .enum([...AD_STATUSES, "deleted"])
    .optional()
    .catch(undefined),
  page,
});
export type AdminAdsQuery = z.output<typeof adminAdsQuerySchema>;

export const adminVideosQuerySchema = z.object({
  q: query,
  hidden: z.enum(["1"]).optional().catch(undefined),
  page,
});
export type AdminVideosQuery = z.output<typeof adminVideosQuerySchema>;

export const adminUsersQuerySchema = z.object({
  q: query,
  role: z.enum(ROLES).optional().catch(undefined),
  page,
});
export type AdminUsersQuery = z.output<typeof adminUsersQuerySchema>;

export const removeAdSchema = z.object({
  id: objectIdSchema,
  reason: z.string().trim().min(3, "Give a reason (at least 3 characters).").max(500),
});
export type RemoveAdInput = z.input<typeof removeAdSchema>;

export const hideVideoSchema = z.object({
  id: objectIdSchema,
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
});
export type HideVideoInput = z.input<typeof hideVideoSchema>;

export type AdminOverviewDTO = {
  pendingReview: number;
  liveAds: number;
  usersByRole: Record<Role, number>;
  uploadsLast24h: { ads: number; videos: number };
};

export type AdminAdRowDTO = {
  id: string;
  title: string;
  businessName: string;
  status: AdStatus;
  deleted: boolean;
  inMarketplace: boolean;
  posterUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  removalReason: string | null;
  rejectionReason: string | null;
};

export type AdminVideoRowDTO = {
  id: string;
  title: string;
  creatorEmail: string | null;
  status: VideoStatus;
  hidden: boolean;
  posterUrl: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  createdAt: string;
};

export type AdminUserRowDTO = {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  displayName: string | null;
  counts: { ads: number; videos: number; projects: number };
};

export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };
