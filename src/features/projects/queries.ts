import "server-only";

import { posterOf } from "@/features/ads/queries";
import { connectDb } from "@/lib/db";
import type { CurrentUser } from "@/lib/permissions";
import { Ad, type AdDoc } from "@/models/ad";
import { CreatorVideo, type CreatorVideoDoc } from "@/models/creator-video";
import { Project, type ProjectDoc } from "@/models/project";
import { toObjectId } from "@/models/shared";

import type { ProjectAdDTO, ProjectEditorDTO, ProjectListItemDTO } from "./schemas";

/**
 * Unavailability is computed on read (DATA_MODEL invariant, PRJ-07): a burst whose ad left the
 * Marketplace keeps its place but gets `available: false` and no playable URL (ADM-03 AC1).
 */
function toProjectAd(ad: AdDoc | undefined, adId: string): ProjectAdDTO {
  if (!ad?.video) {
    return {
      id: adId,
      title: "Deleted ad",
      url: null,
      posterUrl: null,
      durationSec: 1,
      aspectRatio: "horizontal",
      available: false,
    };
  }
  const available = ad.inMarketplace && !ad.deletedAt;
  return {
    id: adId,
    title: ad.deletedAt ? "Deleted ad" : ad.title,
    url: available ? ad.video.url : null,
    posterUrl: available ? posterOf(ad) : null,
    durationSec: ad.video.durationSec,
    aspectRatio: ad.video.aspectRatio,
    available,
  };
}

async function adsById(ids: string[]) {
  if (ids.length === 0) return new Map<string, AdDoc>();
  const ads = await Ad.find({ _id: { $in: [...new Set(ids)] } }).lean<AdDoc[]>();
  return new Map(ads.map((a) => [String(a._id), a]));
}

/** PRJ-02 / PRJ-06: everything the editor needs to restore a project exactly. */
export async function getProjectEditor(
  user: CurrentUser,
  id: string,
): Promise<ProjectEditorDTO | null> {
  const oid = toObjectId(id);
  if (!oid) return null;
  await connectDb();
  const project = await Project.findOne({ _id: oid, deletedAt: null }).lean<ProjectDoc>();
  if (!project || (user.role !== "admin" && String(project.creatorId) !== user.id)) return null;
  const video = await CreatorVideo.findOne({
    _id: project.creatorVideoId,
    deletedAt: null,
  }).lean<CreatorVideoDoc>();
  if (!video?.video || (video.hiddenByAdmin && user.role !== "admin")) return null;
  const ads = await adsById(project.bursts.map((b) => String(b.adId)));
  return {
    id: String(project._id),
    name: project.name,
    revision: project.revision,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
    video: {
      id: String(video._id),
      title: video.title,
      url: video.video.url,
      posterUrl: video.video.posterUrl,
      durationSec: video.video.durationSec,
      aspectRatio: video.video.aspectRatio,
    },
    bursts: [...project.bursts]
      .sort((a, b) => a.atSec - b.atSec)
      .map((b) => ({
        id: b.id,
        atSec: b.atSec,
        ad: toProjectAd(ads.get(String(b.adId)), String(b.adId)),
      })),
  };
}

/** PRJ-05: newest edits first. */
export async function listProjects(user: CurrentUser): Promise<ProjectListItemDTO[]> {
  await connectDb();
  const projects = await Project.find({ creatorId: toObjectId(user.id), deletedAt: null })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(500)
    .lean<ProjectDoc[]>();
  if (projects.length === 0) return [];
  const videos = await CreatorVideo.find(
    { _id: { $in: projects.map((p) => p.creatorVideoId) } },
    { title: 1, video: 1 },
  ).lean();
  const videoById = new Map(videos.map((v) => [String(v._id), v]));
  const ads = await adsById(projects.flatMap((p) => p.bursts.map((b) => String(b.adId))));
  return projects.map((p) => {
    const v = videoById.get(String(p.creatorVideoId));
    return {
      id: String(p._id),
      name: p.name,
      videoTitle: v?.title ?? "—",
      posterUrl: v?.video?.posterUrl ?? null,
      burstCount: p.bursts.length,
      unavailableCount: p.bursts.filter((b) => !ads.get(String(b.adId))?.inMarketplace).length,
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}
