import "server-only";

import { limits } from "@/config/limits";
import { expireStaleAdUploads, purgeAdMedia } from "@/features/ads/service";
import { expireStaleVideoUploads } from "@/features/videos/service";
import { logger } from "@/lib/logger";

// Daily cleanup (ARCHITECTURE §10, NFR reliability): stuck uploads fail after 24 h; media of
// deleted/removed ads is purged after a 7-day grace period.

export type CleanupStats = { staleAdUploads: number; staleVideoUploads: number; purgedAds: number };

export async function runCleanup(now = new Date()): Promise<CleanupStats> {
  const stuckBefore = new Date(now.getTime() - limits.cleanup.stuckUploadHours * 60 * 60 * 1000);
  const graceBefore = new Date(
    now.getTime() - limits.cleanup.deletedGraceDays * 24 * 60 * 60 * 1000,
  );
  const stats = {
    staleAdUploads: await expireStaleAdUploads(stuckBefore),
    staleVideoUploads: await expireStaleVideoUploads(stuckBefore),
    purgedAds: await purgeAdMedia(graceBefore),
  };
  logger.info("cleanup.done", stats);
  return stats;
}
