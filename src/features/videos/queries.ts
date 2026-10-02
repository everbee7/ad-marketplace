import "server-only";

import { connectDb } from "@/lib/db";
import type { CurrentUser } from "@/lib/permissions";
import { CreatorVideo, type CreatorVideoDoc } from "@/models/creator-video";
import { Project } from "@/models/project";
import { toObjectId } from "@/models/shared";

import type { CreatorVideoDetailDTO, CreatorVideoDTO } from "./schemas";

function toDTO(doc: CreatorVideoDoc, projectCount: number): CreatorVideoDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    status: doc.status,
    posterUrl: doc.video?.posterUrl ?? null,
    durationSec: doc.video?.durationSec ?? null,
    aspectRatio: doc.video?.aspectRatio ?? null,
    projectCount,
    createdAt: doc.createdAt.toISOString(),
    errorMessage: doc.errorMessage,
    hidden: doc.hiddenByAdmin,
  };
}

/** VID-02: the creator's videos, newest first, with the number of projects using each. */
export async function listCreatorVideos(
  user: CurrentUser,
  opts: { readyOnly?: boolean } = {},
): Promise<CreatorVideoDTO[]> {
  await connectDb();
  const creatorId = toObjectId(user.id);
  const docs = await CreatorVideo.find({
    creatorId,
    deletedAt: null,
    ...(opts.readyOnly ? { status: "ready", hiddenByAdmin: false } : {}),
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(500)
    .lean<CreatorVideoDoc[]>();
  if (docs.length === 0) return [];
  const counts = await Project.aggregate<{ _id: unknown; n: number }>([
    { $match: { creatorId, deletedAt: null } },
    { $group: { _id: "$creatorVideoId", n: { $sum: 1 } } },
  ]);
  const byVideo = new Map(counts.map((c) => [String(c._id), c.n]));
  return docs.map((d) => toDTO(d, byVideo.get(String(d._id)) ?? 0));
}

/**
 * VID-01 AC3: the playable URL is only returned to the owner and admins, and never for a video an
 * admin hid (except to admins).
 */
export async function getCreatorVideo(
  user: CurrentUser,
  id: string,
): Promise<CreatorVideoDetailDTO | null> {
  const oid = toObjectId(id);
  if (!oid) return null;
  await connectDb();
  const doc = await CreatorVideo.findOne({ _id: oid, deletedAt: null }).lean<CreatorVideoDoc>();
  if (!doc || (user.role !== "admin" && String(doc.creatorId) !== user.id)) return null;
  const projectCount = await Project.countDocuments({ creatorVideoId: oid, deletedAt: null });
  const playable = doc.status === "ready" && (!doc.hiddenByAdmin || user.role === "admin");
  return {
    ...toDTO(doc, projectCount),
    url: playable ? (doc.video?.url ?? null) : null,
    width: doc.video?.width ?? null,
    height: doc.video?.height ?? null,
  };
}
