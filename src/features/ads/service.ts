import "server-only";

import type { Types } from "mongoose";
import type { z } from "zod";

import type { AdStatus, ModerationAction } from "@/config/enums";
import { limits } from "@/config/limits";
import { mediaPaths, mediaTargets, verifyImageUrl } from "@/features/uploads/service";
import { connectDb } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { adFileProblem, adProbeProblem, bufferSource, MEDIA_MESSAGES, probeMp4 } from "@/lib/media";
import type { CurrentUser } from "@/lib/permissions";
import {
  deleteObjects,
  deletePathnames,
  headObject,
  pathnameFromUrl,
  readObject,
} from "@/lib/storage";
import { Ad, type AdDoc } from "@/models/ad";
import { ModerationLog } from "@/models/moderation-log";
import { Profile } from "@/models/profile";
import { aspectRatioOf, toObjectId, type VideoAsset } from "@/models/shared";

import { canTransition, computeInMarketplace } from "./lifecycle";
import type { adMetaSchema, AdUploadResultDTO, AdUploadStartDTO, FileMeta } from "./schemas";

// The only place that changes an ad's status (AGENTS.md, PRD §9.1, ADR-0006).

type AdMeta = z.output<typeof adMetaSchema>;
type Lean = AdDoc;

const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov" };

function oid(id: string) {
  const o = toObjectId(id);
  if (!o) throw new DomainError("NOT_FOUND", "Ad not found.");
  return o;
}

/** Loads an ad the business owns (or any ad for admins). Soft-deleted ads are invisible. */
export async function loadAd(user: CurrentUser, id: string): Promise<Lean> {
  await connectDb();
  const ad = await Ad.findOne({ _id: oid(id), deletedAt: null }).lean<Lean>();
  if (!ad || (user.role !== "admin" && String(ad.businessId) !== user.id)) {
    throw new DomainError("NOT_FOUND", "Ad not found.");
  }
  return ad;
}

function assertTransition(from: AdStatus, to: AdStatus) {
  if (!canTransition(from, to)) {
    throw new DomainError("INVALID_TRANSITION", `This ad can't move from ${from} to ${to}.`);
  }
}

/**
 * Applies a status change with history and recomputed visibility in one atomic update, guarded by
 * the expected current status so concurrent requests can't skip a step.
 */
async function transition(
  ad: Lean,
  to: AdStatus,
  set: Partial<Record<keyof AdDoc, unknown>> = {},
  reason: string | null = null,
): Promise<Lean> {
  assertTransition(ad.status, to);
  const next = { ...ad, ...set, status: to } as Lean;
  const updated = await Ad.findOneAndUpdate(
    { _id: ad._id, status: ad.status, deletedAt: null },
    {
      $set: { ...set, status: to, inMarketplace: computeInMarketplace(next) },
      $push: { statusHistory: { status: to, at: new Date(), reason } },
    },
    { new: true, lean: true },
  );
  if (!updated)
    throw new DomainError("CONFLICT", "This ad changed in the meantime. Refresh and try again.");
  return updated as Lean;
}

async function log(
  actor: CurrentUser,
  adId: Types.ObjectId,
  action: ModerationAction,
  reason: string | null,
) {
  await ModerationLog.create({
    actorId: oid(actor.id),
    targetType: "ad",
    targetId: adId,
    action,
    reason,
  });
}

async function businessIdentity(userId: string) {
  const profile = await Profile.findOne({ userId: oid(userId) }, { business: 1 }).lean();
  if (!profile?.business)
    throw new DomainError("FORBIDDEN", "Please complete your company profile first.");
  return { businessName: profile.business.companyName, businessLogoUrl: profile.business.logoUrl };
}

// --- AD-01 / AD-02 / AD-05: uploads ------------------------------------------------------------

/** Cheap pre-check of client-reported facts; the real check runs in finalizeAdUpload. */
function precheck(file: FileMeta) {
  const problem = adFileProblem(file) ?? adProbeProblem({ ...file, codecString: file.codec });
  if (problem) throw new DomainError("MEDIA_INVALID", problem, { file: problem });
}

/** New ad: creates the doc in `uploading` and reserves the storage pathnames. */
export async function startNewAdUpload(
  user: CurrentUser,
  meta: AdMeta,
  file: FileMeta,
): Promise<AdUploadStartDTO> {
  precheck(file);
  await connectDb();
  const identity = await businessIdentity(user.id);
  const customThumbnailUrl = await verifyImageUrl(user, meta.customThumbnailUrl, "thumbnail");
  const ad = new Ad({
    businessId: oid(user.id),
    ...identity,
    title: meta.title,
    description: meta.description,
    category: meta.category,
    tags: meta.tags,
    customThumbnailUrl,
    status: "uploading",
    statusHistory: [{ status: "uploading", at: new Date(), reason: null }],
  });
  const paths = mediaPaths("ads", ad.id, EXT[file.type] ?? "mp4");
  ad.pendingUpload = { ...paths, startedAt: new Date() };
  await ad.save();
  return { id: ad.id, ...mediaTargets("ad", ad.id, paths) };
}

/** AD-02 / AD-05: replace the video on an existing ad, keeping its metadata. */
export async function startReplaceUpload(
  user: CurrentUser,
  adId: string,
  file: FileMeta,
): Promise<AdUploadStartDTO> {
  precheck(file);
  const ad = await loadAd(user, adId);
  if (!["failed", "live", "rejected", "unlisted"].includes(ad.status)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      "The video can't be replaced while the ad is in this state.",
    );
  }
  const paths = mediaPaths("ads", String(ad._id), EXT[file.type] ?? "mp4");
  const pendingUpload = { ...paths, startedAt: new Date() };
  if (ad.status === "failed") {
    await transition(ad, "uploading", { pendingUpload });
  } else {
    await Ad.updateOne({ _id: ad._id }, { $set: { pendingUpload } });
  }
  return { id: String(ad._id), ...mediaTargets("ad", String(ad._id), paths) };
}

/** Server-side verification of the uploaded MP4 (never trusts client metadata for ads). */
type Verified = { ok: true; asset: VideoAsset } | { ok: false; problem: string };

async function verifyAdVideo(
  videoUrl: string,
  posterUrl: string,
  reserved: { videoPath: string; posterPath: string },
): Promise<Verified> {
  if (
    pathnameFromUrl(videoUrl) !== reserved.videoPath ||
    pathnameFromUrl(posterUrl) !== reserved.posterPath
  ) {
    throw new DomainError("FORBIDDEN", "Upload not allowed.");
  }
  const [video, poster] = await Promise.all([headObject(videoUrl), headObject(posterUrl)]);
  if (!video) return { ok: false, problem: "The upload didn't finish. Please try again." };
  const typeProblem = adFileProblem({ type: video.contentType, size: video.size });
  if (typeProblem) return { ok: false, problem: typeProblem };
  let probe;
  try {
    probe = await probeMp4(bufferSource(await readObject(videoUrl, limits.ad.maxSizeBytes)));
  } catch {
    return { ok: false, problem: MEDIA_MESSAGES.unreadable };
  }
  const problem = adProbeProblem(probe);
  if (problem) return { ok: false, problem };
  const asset: VideoAsset = {
    url: video.url,
    pathname: video.pathname,
    posterUrl: poster?.contentType === "image/jpeg" ? poster.url : null,
    posterPathname: poster?.contentType === "image/jpeg" ? poster.pathname : null,
    sizeBytes: video.size,
    contentType: video.contentType,
    codec: probe.codecString,
    durationSec: probe.durationSec,
    width: probe.width,
    height: probe.height,
    aspectRatio: aspectRatioOf(probe.width, probe.height),
    errorMessage: null,
  };
  return { ok: true, asset };
}

/** AD-01 AC3/AC5: verify, then In review, or Failed with the reason. */
export async function finalizeAdUpload(
  user: CurrentUser,
  adId: string,
  urls: { videoUrl: string; posterUrl: string },
): Promise<AdUploadResultDTO> {
  const ad = await loadAd(user, adId);
  if (!ad.pendingUpload)
    throw new DomainError("CONFLICT", "There is no upload in progress for this ad.");
  const result = await verifyAdVideo(urls.videoUrl, urls.posterUrl, ad.pendingUpload);
  const now = new Date();

  if (!result.ok) {
    await deleteObjects([urls.videoUrl, urls.posterUrl]);
    if (ad.status === "uploading") {
      await transition(
        ad,
        "failed",
        { pendingUpload: null, errorMessage: result.problem },
        result.problem,
      );
      return { id: adId, status: "failed", errorMessage: result.problem };
    }
    // Replacing on a live/rejected/unlisted ad: the current version is untouched (ADR-0006).
    await Ad.updateOne({ _id: ad._id }, { $set: { pendingUpload: null } });
    throw new DomainError("MEDIA_INVALID", result.problem, { file: result.problem });
  }

  const asset = result.asset;
  if (ad.status === "uploading") {
    await transition(ad, "pending_review", {
      video: asset,
      pendingUpload: null,
      submittedAt: now,
      pendingVideo: null,
      errorMessage: null,
    });
  } else if (ad.status === "live" || ad.status === "unlisted") {
    if (ad.status === "unlisted") {
      // Video changed since approval: relisting needs a review (AD-06 AC2). Go via live → pending_review
      // is not allowed from unlisted, so the replacement is stored and reviewed on relist.
      if (ad.pendingVideo) await deleteObjects([ad.pendingVideo.url, ad.pendingVideo.posterUrl]);
      await Ad.updateOne({ _id: ad._id }, { $set: { pendingVideo: asset, pendingUpload: null } });
      return { id: adId, status: "unlisted", errorMessage: null };
    }
    if (ad.pendingVideo) await deleteObjects([ad.pendingVideo.url, ad.pendingVideo.posterUrl]);
    await transition(ad, "pending_review", {
      pendingVideo: asset,
      pendingUpload: null,
      submittedAt: now,
    });
  } else if (ad.status === "rejected") {
    const old = ad.approvedAt ? ad.pendingVideo : ad.video;
    if (old) await deleteObjects([old.url, old.posterUrl]);
    const set = ad.approvedAt ? { pendingVideo: asset } : { video: asset, pendingVideo: null };
    await transition(ad, "pending_review", {
      ...set,
      pendingUpload: null,
      submittedAt: now,
      rejectionReason: null,
    });
    await log(user, ad._id, "resubmit", null);
  } else {
    throw new DomainError("INVALID_TRANSITION", "This ad can't accept a new video right now.");
  }
  return { id: adId, status: "pending_review", errorMessage: null };
}

/** AD-01 AC2: cancel deletes the uploaded objects and marks a new ad as failed. */
export async function cancelAdUpload(user: CurrentUser, adId: string): Promise<void> {
  const ad = await loadAd(user, adId);
  if (!ad.pendingUpload) return;
  await deletePathnames([ad.pendingUpload.videoPath, ad.pendingUpload.posterPath]);
  if (ad.status === "uploading") {
    await transition(ad, "failed", { pendingUpload: null }, "Upload cancelled.");
  } else {
    await Ad.updateOne({ _id: ad._id }, { $set: { pendingUpload: null } });
  }
}

// --- AD-05 / AD-06 / AD-07: business actions ---------------------------------------------------

/** AD-05: metadata edits keep the status (AC1); thumbnails are re-verified. */
export async function updateAdMeta(user: CurrentUser, adId: string, meta: AdMeta): Promise<void> {
  const ad = await loadAd(user, adId);
  if (ad.status === "removed")
    throw new DomainError("INVALID_TRANSITION", "Removed ads can't be edited.");
  const customThumbnailUrl = await verifyImageUrl(
    user,
    meta.customThumbnailUrl,
    "thumbnail",
    String(ad.businessId),
  );
  await Ad.updateOne(
    { _id: ad._id },
    {
      $set: {
        title: meta.title,
        description: meta.description,
        category: meta.category,
        tags: meta.tags,
        customThumbnailUrl,
      },
    },
  );
  if (ad.customThumbnailUrl && ad.customThumbnailUrl !== customThumbnailUrl) {
    await deleteObjects([ad.customThumbnailUrl]);
  }
}

/** AD-05 AC3: a rejected ad goes back to review after edits. */
export async function resubmitAd(user: CurrentUser, adId: string): Promise<void> {
  const ad = await loadAd(user, adId);
  await transition(ad, "pending_review", { submittedAt: new Date(), rejectionReason: null });
  await log(user, ad._id, "resubmit", null);
}

/** AD-06 AC1. */
export async function unlistAd(user: CurrentUser, adId: string): Promise<void> {
  await transition(await loadAd(user, adId), "unlisted");
}

/** AD-06 AC2: back to live without review, unless the video changed since approval. */
export async function relistAd(user: CurrentUser, adId: string): Promise<AdStatus> {
  const ad = await loadAd(user, adId);
  if (ad.pendingVideo) {
    // A replacement uploaded while unlisted: relist goes live with the approved video and queues
    // the new one for review (unlisted → live → pending_review).
    const live = await transition(ad, "live");
    await transition(live, "pending_review", { submittedAt: new Date() });
    return "pending_review";
  }
  await transition(ad, "live");
  return "live";
}

/** AD-07: soft delete; projects show the bursts as Unavailable (J4). */
export async function deleteAd(user: CurrentUser, adId: string): Promise<void> {
  const ad = await loadAd(user, adId);
  await Ad.updateOne(
    { _id: ad._id },
    { $set: { deletedAt: new Date(), inMarketplace: false, pendingUpload: null } },
  );
}

// --- ADM-02: review ----------------------------------------------------------------------------

export async function approveAd(admin: CurrentUser, adId: string): Promise<void> {
  const ad = await loadAd(admin, adId);
  if (ad.pendingVideo && ad.approvedAt) {
    const old = ad.video;
    await transition(ad, "live", {
      video: ad.pendingVideo,
      pendingVideo: null,
      approvedAt: new Date(),
    });
    if (old) await deleteObjects([old.url, old.posterUrl]);
  } else {
    await transition(ad, "live", { approvedAt: new Date(), rejectionReason: null });
  }
  await log(admin, ad._id, "approve", null);
}

export async function rejectAd(admin: CurrentUser, adId: string, reason: string): Promise<void> {
  const ad = await loadAd(admin, adId);
  await transition(ad, "rejected", { rejectionReason: reason }, reason);
  await log(admin, ad._id, "reject", reason);
}

/** ADM-03 (M7): live → removed, terminal. */
export async function removeAd(admin: CurrentUser, adId: string, reason: string): Promise<void> {
  const ad = await loadAd(admin, adId);
  await transition(ad, "removed", { removalReason: reason, removedAt: new Date() }, reason);
  await log(admin, ad._id, "remove", reason);
}

// --- PRF-02: denormalised business identity ----------------------------------------------------

export async function syncBusinessIdentity(
  userId: string,
  businessName: string,
  businessLogoUrl: string | null,
) {
  await connectDb();
  await Ad.updateMany({ businessId: oid(userId) }, { $set: { businessName, businessLogoUrl } });
}
