import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { env } from "@/env";
import { authorizeUpload } from "@/features/uploads/service";
import { DomainError, httpStatus } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireUser } from "@/lib/permissions";
import { enforce } from "@/lib/ratelimit";

// Vercel Blob client-upload handshake (API.md). Bytes go browser → Blob; this only issues a token
// scoped to one reserved pathname, with content-type and size limits.

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await requireUser({ onboarded: false });
        await enforce("uploadToken", user.id);
        const grant = await authorizeUpload(user, pathname, clientPayload ?? "");
        return {
          allowedContentTypes: grant.allowedContentTypes,
          maximumSizeInBytes: grant.maximumSizeInBytes,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: clientPayload,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: httpStatus[err.code] },
      );
    }
    logger.error("uploads.token_failed", { route: "/api/uploads/token" }, err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Upload could not start." } },
      { status: 400 },
    );
  }
}
