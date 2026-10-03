import "server-only";

import mongoose, { type ClientSession, type Types } from "mongoose";
import { nanoid } from "nanoid";

import { connectDb } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/permissions";
import { Ad } from "@/models/ad";
import { CreatorVideo } from "@/models/creator-video";
import { Project, type ProjectDoc } from "@/models/project";
import { toObjectId } from "@/models/shared";

import { burstsProblem, sortPlaced, type PlacedBurst } from "./bursts";
import type { BurstInput, SaveResultDTO } from "./schemas";

// PRJ-01..07. Invariants (DATA_MODEL `projects`): bursts sorted by atSec, ≥ 1.0 s apart, ≤ 10, each
// ad was in the Marketplace when placed. ads.projectCount = number of live projects using the ad.

function oid(id: string, what = "Project") {
  const o = toObjectId(id);
  if (!o) throw new DomainError("NOT_FOUND", `${what} not found.`);
  return o;
}

export async function loadProject(user: CurrentUser, id: string): Promise<ProjectDoc> {
  await connectDb();
  const p = await Project.findOne({ _id: oid(id), deletedAt: null }).lean<ProjectDoc>();
  if (!p || (user.role !== "admin" && String(p.creatorId) !== user.id))
    throw new DomainError("NOT_FOUND", "Project not found.");
  return p;
}

async function readyVideo(user: CurrentUser, videoId: Types.ObjectId, session?: ClientSession) {
  const v = await CreatorVideo.findOne({ _id: videoId, creatorId: oid(user.id), deletedAt: null })
    .session(session ?? null)
    .lean();
  if (!v) throw new DomainError("NOT_FOUND", "Video not found.");
  if (v.status !== "ready" || !v.video || v.hiddenByAdmin) {
    throw new DomainError("INVALID_TRANSITION", "Only Ready videos can be used in a project.");
  }
  return v;
}

/** +1/-1 on ads.projectCount for ads that start/stop being used by one project. */
async function adjustProjectCounts(
  before: Set<string>,
  after: Set<string>,
  session: ClientSession,
) {
  for (const id of after)
    if (!before.has(id))
      await Ad.updateOne({ _id: id }, { $inc: { projectCount: 1 } }, { session });
  for (const id of before) {
    if (!after.has(id))
      await Ad.updateOne(
        { _id: id, projectCount: { $gt: 0 } },
        { $inc: { projectCount: -1 } },
        { session },
      );
  }
}

const adSet = (bursts: { adId: unknown }[]) => new Set(bursts.map((b) => String(b.adId)));

/** Ads newly placed must be in the Marketplace now (§9.1 "can be newly placed"). */
async function assertPlaceable(newAdIds: string[], session: ClientSession) {
  if (newAdIds.length === 0) return;
  const ok = await Ad.countDocuments({
    _id: { $in: newAdIds },
    inMarketplace: true,
    deletedAt: null,
  }).session(session);
  if (ok !== new Set(newAdIds).size)
    throw new DomainError("INVALID_TRANSITION", "One of these ads is no longer available.");
}

/** PRJ-01: from a Ready video; optionally with the ad the user started from at 0.0 s. */
export async function createProject(
  user: CurrentUser,
  videoId: string,
  adId?: string,
): Promise<string> {
  await connectDb();
  const vid = oid(videoId, "Video");
  let id = "";
  await mongoose.connection.transaction(async (session) => {
    const video = await readyVideo(user, vid, session);
    const bursts: PlacedBurst[] = adId ? [{ id: nanoid(10), adId, atSec: 0 }] : [];
    if (adId) await assertPlaceable([adId], session);
    const [doc] = await Project.create(
      [
        {
          creatorId: oid(user.id),
          name: video.title,
          creatorVideoId: vid,
          bursts,
          status: "draft",
          revision: 0,
        },
      ],
      { session },
    );
    await adjustProjectCounts(new Set(), adSet(bursts), session);
    id = String(doc!._id);
  });
  return id;
}

/**
 * PRJ-03 / PRJ-04 AC1: replace the bursts (auto-save as draft). `revision` is optimistic
 * concurrency: a stale tab gets CONFLICT instead of overwriting newer edits.
 */
export async function updateBursts(
  user: CurrentUser,
  id: string,
  revision: number,
  input: BurstInput[],
): Promise<SaveResultDTO> {
  const project = await loadProject(user, id);
  if (project.revision !== revision) {
    throw new DomainError(
      "CONFLICT",
      "This project was changed in another tab. Reload to see the latest version.",
    );
  }
  const video = await CreatorVideo.findById(project.creatorVideoId, { video: 1 }).lean();
  const duration = video?.video?.durationSec ?? 0;
  const bursts = sortPlaced(input);
  const problem = burstsProblem(bursts, duration);
  if (problem) throw new DomainError("VALIDATION", problem);

  let result: SaveResultDTO | null = null;
  await mongoose.connection.transaction(async (session) => {
    const before = adSet(project.bursts);
    const after = adSet(bursts);
    await assertPlaceable(
      [...after].filter((a) => !before.has(a)),
      session,
    );
    const updated = await Project.findOneAndUpdate(
      { _id: project._id, revision, deletedAt: null },
      {
        $set: {
          bursts: bursts.map((b) => ({ id: b.id, adId: b.adId, atSec: b.atSec })),
          status: "draft",
        },
        $inc: { revision: 1 },
      },
      { new: true, session, lean: true },
    );
    if (!updated)
      throw new DomainError(
        "CONFLICT",
        "This project was changed in another tab. Reload to see the latest version.",
      );
    await adjustProjectCounts(before, after, session);
    result = {
      revision: updated.revision,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
  return result!;
}

/** PRJ-04 AC2: mark as saved (not draft). */
export async function saveProject(
  user: CurrentUser,
  id: string,
  revision: number,
): Promise<SaveResultDTO> {
  const project = await loadProject(user, id);
  const updated = await Project.findOneAndUpdate(
    { _id: project._id, revision, deletedAt: null },
    { $set: { status: "saved" }, $inc: { revision: 1 } },
    { new: true, lean: true },
  );
  if (!updated)
    throw new DomainError(
      "CONFLICT",
      "This project was changed in another tab. Reload to see the latest version.",
    );
  return {
    revision: updated.revision,
    status: updated.status,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/** PRJ-01 AC1 / PRJ-05. */
export async function renameProject(user: CurrentUser, id: string, name: string): Promise<void> {
  const project = await loadProject(user, id);
  await Project.updateOne({ _id: project._id }, { $set: { name } });
}

/** PRJ-05: copy with the same video and bursts (fresh burst ids), as a draft. */
export async function duplicateProject(user: CurrentUser, id: string): Promise<string> {
  const project = await loadProject(user, id);
  let newId = "";
  await mongoose.connection.transaction(async (session) => {
    await readyVideo(user, project.creatorVideoId, session);
    const bursts = project.bursts.map((b) => ({ id: nanoid(10), adId: b.adId, atSec: b.atSec }));
    const [doc] = await Project.create(
      [
        {
          creatorId: project.creatorId,
          name: `${project.name} (copy)`.slice(0, 100),
          creatorVideoId: project.creatorVideoId,
          bursts,
          status: "draft",
          revision: 0,
        },
      ],
      { session },
    );
    await adjustProjectCounts(new Set(), adSet(bursts), session);
    newId = String(doc!._id);
  });
  return newId;
}

/** PRJ-05: delete (soft), releasing the ads' project counts. */
export async function deleteProject(user: CurrentUser, id: string): Promise<void> {
  const project = await loadProject(user, id);
  await mongoose.connection.transaction(async (session) => {
    const res = await Project.updateOne(
      { _id: project._id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { session },
    );
    if (res.modifiedCount === 1)
      await adjustProjectCounts(adSet(project.bursts), new Set(), session);
  });
}
