import "server-only";

import type { ImageKind } from "@/config/enums";
import { limits } from "@/config/limits";
import { DomainError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/permissions";
import { headObject, ownsUrl, storageDriver, withRandomSuffix } from "@/lib/storage";

import { IMAGE_ERROR, type UploadTargetDTO } from "./schemas";

// Decides which storage pathname a user may write, with which content types and size.
// Used by the Blob token route and the local dev-files route, so both drivers enforce the same rules.

export type UploadGrant = { allowedContentTypes: string[]; maximumSizeInBytes: number };

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
  const [prefix, kind] = uploadKey.split(":");
  if (prefix !== "image" || !kind || !["logo", "avatar", "thumbnail"].includes(kind)) {
    throw new DomainError("FORBIDDEN", "Upload not allowed.");
  }
  if (!pathname.startsWith(imagePrefix(user.id, kind as ImageKind))) {
    throw new DomainError("FORBIDDEN", "Upload not allowed.");
  }
  return {
    allowedContentTypes: [...limits.image.contentTypes],
    maximumSizeInBytes: limits.image.maxSizeBytes,
  };
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
