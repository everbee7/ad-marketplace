import "server-only";

import type { ImageKind } from "@/config/enums";
import { limits } from "@/config/limits";
import { DomainError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/permissions";
import { connectDb } from "@/lib/db";
import { headObject, ownsUrl, storageDriver, withRandomSuffix } from "@/lib/storage";
import { Ad } from "@/models/ad";
import { toObjectId } from "@/models/shared";

import { IMAGE_ERROR, type UploadTargetDTO } from "./schemas";

// Decides which storage pathname a user may write, with which content types and size.
// Used by the Blob token route and the local dev-files route, so both drivers enforce the same rules.

export type UploadGrant = { allowedContentTypes: string[]; maximumSizeInBytes: number };

/** Media slots of doc-bound uploads (ads, creator videos): key = `<kind>:<docId>:<slot>`. */
export type MediaSlot = "video" | "poster";

const POSTER_GRANT: UploadGrant = {
  allowedContentTypes: ["image/jpeg"],
  maximumSizeInBytes: limits.image.maxSizeBytes,
};

/** Reserved pathnames for a new media upload (ARCHITECTURE §7.2 step 2). */
export function mediaPaths(base: "ads" | "videos", docId: string, ext: string) {
  return {
    videoPath: withRandomSuffix(`${base}/${docId}/video`, ext),
    posterPath: withRandomSuffix(`${base}/${docId}/poster`, "jpg"),
  };
}

export function mediaTargets(
  kind: "ad" | "video",
  docId: string,
  paths: { videoPath: string; posterPath: string },
) {
  const driver = storageDriver();
  return {
    video: { driver, pathname: paths.videoPath, uploadKey: `${kind}:${docId}:video` },
    poster: { driver, pathname: paths.posterPath, uploadKey: `${kind}:${docId}:poster` },
  };
}

async function adGrant(
  user: CurrentUser,
  adId: string | undefined,
  slot: string | undefined,
  pathname: string,
) {
  const id = adId ? toObjectId(adId) : null;
  if (!id || user.role !== "business") return null;
  await connectDb();
  const ad = await Ad.findOne(
    { _id: id, businessId: toObjectId(user.id), deletedAt: null },
    { pendingUpload: 1 },
  ).lean();
  const reserved = ad?.pendingUpload;
  if (!reserved) return null;
  if (slot === "video" && pathname === reserved.videoPath) {
    return {
      allowedContentTypes: [...limits.ad.containers],
      maximumSizeInBytes: limits.ad.maxSizeBytes,
    };
  }
  if (slot === "poster" && pathname === reserved.posterPath) return POSTER_GRANT;
  return null;
}

/** Extra resolvers for later features (creator videos) keep the same exact-pathname rule. */
const extraResolvers: Record<string, typeof adGrant> = {};
export function registerMediaResolver(kind: string, resolver: typeof adGrant) {
  extraResolvers[kind] = resolver;
}

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function imagePrefix(userId: string, kind: ImageKind) {
  return `images/${userId}/${kind}-`;
}

export function imageTarget(
  user: CurrentUser,
  kind: ImageKind,
  contentType: string,
): UploadTargetDTO {
  const ext = IMAGE_EXT[contentType];
  if (!ext) throw new DomainError("MEDIA_INVALID", IMAGE_ERROR);
  return {
    driver: storageDriver(),
    pathname: withRandomSuffix(`images/${user.id}/${kind}`, ext),
    uploadKey: `image:${kind}`,
  };
}

const PATH_RE = /^[a-zA-Z0-9/_.-]+$/;

/** Returns the grant for `pathname` under `uploadKey`, or throws FORBIDDEN. */
export async function authorizeUpload(
  user: CurrentUser,
  pathname: string,
  uploadKey: string,
): Promise<UploadGrant> {
  if (!PATH_RE.test(pathname) || pathname.includes("..")) {
    throw new DomainError("FORBIDDEN", "Upload not allowed.");
  }
  const [prefix, ...rest] = uploadKey.split(":");
  if (prefix === "image") {
    const kind = rest[0] as ImageKind | undefined;
    if (!kind || !["logo", "avatar", "thumbnail"].includes(kind)) {
      throw new DomainError("FORBIDDEN", "Upload not allowed.");
    }
    if (!pathname.startsWith(imagePrefix(user.id, kind))) {
      throw new DomainError("FORBIDDEN", "Upload not allowed.");
    }
    return {
      allowedContentTypes: [...limits.image.contentTypes],
      maximumSizeInBytes: limits.image.maxSizeBytes,
    };
  }
  const [docId, slot] = rest;
  const grant =
    prefix === "ad"
      ? await adGrant(user, docId, slot, pathname)
      : prefix && extraResolvers[prefix]
        ? await extraResolvers[prefix](user, docId, slot, pathname)
        : null;
  if (!grant) throw new DomainError("FORBIDDEN", "Upload not allowed.");
  return grant;
}

/**
 * Re-verifies an uploaded image before it is saved on a profile or ad: it must live under the
 * user's own prefix and respect the type/size limits (never trust the client).
 */
export async function verifyImageUrl(
  user: CurrentUser,
  url: string | null | undefined,
  kind: ImageKind,
  ownerId = user.id,
): Promise<string | null> {
  if (!url) return null;
  if (!ownsUrl(url, imagePrefix(ownerId, kind))) {
    throw new DomainError("MEDIA_INVALID", IMAGE_ERROR, { [`${kind}Url`]: IMAGE_ERROR });
  }
  const meta = await headObject(url);
  if (
    !meta ||
    meta.size > limits.image.maxSizeBytes ||
    !(limits.image.contentTypes as readonly string[]).includes(meta.contentType)
  ) {
    throw new DomainError("MEDIA_INVALID", IMAGE_ERROR, { [`${kind}Url`]: IMAGE_ERROR });
  }
  return meta.url;
}
