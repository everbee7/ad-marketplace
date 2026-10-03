import "server-only";

import mongoose from "mongoose";
import type { z } from "zod";

import type { FileMeta } from "@/features/ads/schemas";
import { mediaPaths, mediaTargets } from "@/features/uploads/service";
import { connectDb } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { videoFileProblem, videoProbeProblem } from "@/lib/media";
import type { CurrentUser } from "@/lib/permissions";
import { deleteObjects, deletePathnames, headObject, pathnameFromUrl } from "@/lib/storage";
import { Ad } from "@/models/ad";
import { CreatorVideo, type CreatorVideoDoc } from "@/models/creator-video";
import { ModerationLog } from "@/models/moderation-log";
import { Project } from "@/models/project";
import { aspectRatioOf, toObjectId, type VideoAsset } from "@/models/shared";

import type { videoMetaSchema } from "./schemas";

// VID-01 / VID-02. Creator videos are private (owner + admins). Status: uploading → ready | failed.

type VideoMeta = z.output<typeof videoMetaSchema>;
type UploadStart = {
  id: string;
  video: ReturnType<typeof mediaTargets>["video"];
  poster: ReturnType<typeof mediaTargets>["poster"];
};

const EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function oid(id: string) {
  const o = toObjectId(id);
  if (!o) throw new DomainError("NOT_FOUND", "Video not found.");
  return o;
}

export async function loadVideo(user: CurrentUser, id: string): Promise<CreatorVideoDoc> {
  await connectDb();
  const doc = await CreatorVideo.findOne({ _id: oid(id), deletedAt: null }).lean<CreatorVideoDoc>();
  if (!doc || (user.role !== "admin" && String(doc.creatorId) !== user.id)) {
    throw new DomainError("NOT_FOUND", "Video not found.");
  }
  return doc;
}

function precheck(file: FileMeta) {
  const problem = videoFileProblem(file) ?? videoProbeProblem(file);
  if (problem) throw new DomainError("MEDIA_INVALID", problem, { file: problem });
  return {
    durationSec: file.durationSec,
    width: file.width,
    height: file.height,
    codec: file.codec,
  };
}

function reserve(id: string, file: FileMeta, meta: ReturnType<typeof precheck>) {
  const paths = mediaPaths("videos", id, EXT[file.type] ?? "mp4");
  return {
    pendingUpload: { ...paths, startedAt: new Date(), meta },
    targets: mediaTargets("video", id, paths),
  };
}

/** VID-01: new video in `uploading` with reserved storage paths. */
export async function startNewVideoUpload(
  user: CurrentUser,
  meta: VideoMeta,
  file: FileMeta,
): Promise<UploadStart> {
  const facts = precheck(file);
  await connectDb();
  const doc = new CreatorVideo({
    creatorId: oid(user.id),
    title: meta.title,
    description: meta.description,
    status: "uploading",
  });
  const { pendingUpload, targets } = reserve(doc.id, file, facts);
  doc.pendingUpload = pendingUpload;
  await doc.save();
  return { id: doc.id, ...targets };
}

/** VID-01 AC2: retry a failed upload on the same video. */
export async function startVideoRetry(
  user: CurrentUser,
  id: string,
  file: FileMeta,
): Promise<UploadStart> {
  const facts = precheck(file);
  const doc = await loadVideo(user, id);
  if (doc.status !== "failed")
    throw new DomainError("INVALID_TRANSITION", "Only failed uploads can be retried.");
  const { pendingUpload, targets } = reserve(String(doc._id), file, facts);
  const updated = await CreatorVideo.updateOne(
    { _id: doc._id, status: "failed" },
    { $set: { status: "uploading", pendingUpload, errorMessage: null } },
  );
  if (updated.modifiedCount !== 1)
    throw new DomainError("CONFLICT", "This video changed. Refresh and try again.");
  return { id: String(doc._id), ...targets };
}

async function fail(doc: CreatorVideoDoc, message: string) {
  await CreatorVideo.updateOne(
    { _id: doc._id, status: "uploading" },
    { $set: { status: "failed", errorMessage: message, pendingUpload: null } },
  );
  return { id: String(doc._id), status: "failed" as const, errorMessage: message };
}

/** VID-01 AC2: Ready as soon as the upload is verified (size + type via head()), else Failed. */
export async function finalizeVideoUpload(
  user: CurrentUser,
  id: string,
  urls: { videoUrl: string; posterUrl: string },
): Promise<{ id: string; status: "ready" | "failed"; errorMessage: string | null }> {
  const doc = await loadVideo(user, id);
  const reserved = doc.pendingUpload;
  if (doc.status !== "uploading" || !reserved?.meta) {
    throw new DomainError("CONFLICT", "There is no upload in progress for this video.");
  }
  if (
    pathnameFromUrl(urls.videoUrl) !== reserved.videoPath ||
    pathnameFromUrl(urls.posterUrl) !== reserved.posterPath
  ) {
    throw new DomainError("FORBIDDEN", "Upload not allowed.");
  }
  const [video, poster] = await Promise.all([
    headObject(urls.videoUrl),
    headObject(urls.posterUrl),
  ]);
  if (!video) return fail(doc, "The upload didn't finish. Please try again.");
  const problem =
    videoFileProblem({ type: video.contentType, size: video.size }) ??
    videoProbeProblem({ codec: reserved.meta.codec, durationSec: reserved.meta.durationSec });
  if (problem) {
    await deleteObjects([urls.videoUrl, urls.posterUrl]);
    return fail(doc, problem);
  }
  const asset: VideoAsset = {
    url: video.url,
    pathname: video.pathname,
    posterUrl: poster?.contentType === "image/jpeg" ? poster.url : null,
    posterPathname: poster?.contentType === "image/jpeg" ? poster.pathname : null,
    sizeBytes: video.size,
    contentType: video.contentType,
    codec: reserved.meta.codec,
    durationSec: Math.round(reserved.meta.durationSec * 1000) / 1000,
    width: reserved.meta.width,
    height: reserved.meta.height,
    aspectRatio: aspectRatioOf(reserved.meta.width, reserved.meta.height),
    errorMessage: null,
  };
  const updated = await CreatorVideo.updateOne(
    { _id: doc._id, status: "uploading" },
    { $set: { status: "ready", video: asset, pendingUpload: null, errorMessage: null } },
  );
  if (updated.modifiedCount !== 1)
    throw new DomainError("CONFLICT", "This video changed. Refresh and try again.");
  return { id, status: "ready", errorMessage: null };
}

export async function cancelVideoUpload(user: CurrentUser, id: string): Promise<void> {
  const doc = await loadVideo(user, id);
  if (!doc.pendingUpload) return;
  await deletePathnames([doc.pendingUpload.videoPath, doc.pendingUpload.posterPath]);
  await fail(doc, "Upload cancelled.");
}

/** VID-02: rename. */
export async function renameVideo(user: CurrentUser, id: string, title: string): Promise<void> {
  const doc = await loadVideo(user, id);
  await CreatorVideo.updateOne({ _id: doc._id }, { $set: { title } });
}

/** Projects that will be deleted with the video (VID-02 AC1 warning). */
export async function countVideoProjects(videoId: mongoose.Types.ObjectId): Promise<number> {
  return Project.countDocuments({ creatorVideoId: videoId, deletedAt: null });
}

/**
 * VID-02 AC1: deletes the video and the projects that use it, keeping each ad's projectCount in
 * sync in the same transaction. Storage objects are removed after the commit.
 */
export async function deleteVideo(
  user: CurrentUser,
  id: string,
): Promise<{ deletedProjects: number }> {
  const doc = await loadVideo(user, id);
  const now = new Date();
  let deletedProjects = 0;
  await mongoose.connection.transaction(async (session) => {
    const projects = await Project.find({ creatorVideoId: doc._id, deletedAt: null }, { bursts: 1 })
      .session(session)
      .lean();
    deletedProjects = projects.length;
    const perAd = new Map<string, number>();
    for (const p of projects) {
      for (const adId of new Set(p.bursts.map((b) => String(b.adId))))
        perAd.set(adId, (perAd.get(adId) ?? 0) + 1);
    }
    for (const [adId, n] of perAd) {
      await Ad.updateOne(
        { _id: adId, projectCount: { $gte: n } },
        { $inc: { projectCount: -n } },
        { session },
      );
    }
    await Project.updateMany(
      { creatorVideoId: doc._id, deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );
    await CreatorVideo.updateOne(
      { _id: doc._id },
      { $set: { deletedAt: now, pendingUpload: null } },
      { session },
    );
  });
  await deleteObjects([doc.video?.url, doc.video?.posterUrl]);
  if (doc.pendingUpload)
    await deletePathnames([doc.pendingUpload.videoPath, doc.pendingUpload.posterPath]);
  return { deletedProjects };
}

/** ADM-03: admins hide/unhide; hidden videos can't be played by anyone but admins (AC1). Logged. */
export async function setVideoHidden(
  admin: CurrentUser,
  id: string,
  hidden: boolean,
  reason: string | null = null,
): Promise<void> {
  const doc = await loadVideo(admin, id);
  await CreatorVideo.updateOne({ _id: doc._id }, { $set: { hiddenByAdmin: hidden } });
  await ModerationLog.create({
    actorId: oid(admin.id),
    targetType: "creatorVideo",
    targetId: doc._id,
    action: hidden ? "hide" : "unhide",
    reason,
  });
}

// --- Cleanup job (ARCHITECTURE §10) ----------------------------------------------------------------

/** Abandoned creator-video uploads older than the cutoff become failed (retry stays possible). */
export async function expireStaleVideoUploads(olderThan: Date): Promise<number> {
  await connectDb();
  const stale = await CreatorVideo.find({
    status: "uploading",
    "pendingUpload.startedAt": { $lt: olderThan },
    deletedAt: null,
  }).lean<CreatorVideoDoc[]>();
  for (const doc of stale) {
    if (doc.pendingUpload)
      await deletePathnames([doc.pendingUpload.videoPath, doc.pendingUpload.posterPath]);
    await fail(doc, "The upload didn't finish within 24 hours. Please try again.");
  }
  return stale.length;
}
