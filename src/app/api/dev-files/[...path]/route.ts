import { Readable } from "node:stream";

import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";
import { authorizeUpload } from "@/features/uploads/service";
import { DomainError, httpStatus } from "@/lib/errors";
import { getCurrentUser, requireUser } from "@/lib/permissions";
import { enforce } from "@/lib/ratelimit";
import { localStat, localStream, localWriteStream } from "@/lib/storage";

// Local storage driver endpoint (API.md): development only. PUT writes an upload the user is
// authorised for; GET serves files with HTTP Range support so <video> can seek.

export const dynamic = "force-dynamic";

function devOnly() {
  if (env.VERCEL || env.STORAGE_DRIVER !== "local") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found." } },
      { status: 404 },
    );
  }
  return null;
}

function errorResponse(err: unknown) {
  if (err instanceof DomainError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: httpStatus[err.code] },
    );
  }
  throw err;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const blocked = devOnly();
  if (blocked) return blocked;
  try {
    const pathname = (await params).path.join("/");
    const user = await requireUser({ onboarded: false });
    await enforce("uploadToken", user.id);
    const grant = await authorizeUpload(user, pathname, request.headers.get("x-upload-key") ?? "");
    const contentType = (request.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!grant.allowedContentTypes.includes(contentType)) {
      throw new DomainError("MEDIA_INVALID", "This file type isn't allowed here.");
    }
    if (await localStat(pathname)) throw new DomainError("CONFLICT", "File already exists.");
    if (!request.body) throw new DomainError("MEDIA_INVALID", "Empty upload.");
    const stored = await localWriteStream(
      pathname,
      request.body,
      contentType,
      grant.maximumSizeInBytes,
    );
    if (!stored) throw new DomainError("MEDIA_INVALID", "This file is too large or empty.");
    return NextResponse.json({ url: stored.url, pathname: stored.pathname });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const blocked = devOnly();
  if (blocked) return blocked;
  if (!(await getCurrentUser())) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in." } },
      { status: 401 },
    );
  }
  const pathname = (await params).path.join("/");
  let meta;
  try {
    meta = await localStat(pathname);
  } catch {
    meta = null;
  }
  if (!meta)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found." } },
      { status: 404 },
    );

  const headers = new Headers({
    "content-type": meta.contentType,
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=3600",
  });
  const range = request.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (match) {
    let start = match[1] ? Number(match[1]) : 0;
    let end = match[2] ? Number(match[2]) : meta.size - 1;
    if (!match[1] && match[2]) {
      start = Math.max(0, meta.size - Number(match[2]));
      end = meta.size - 1;
    }
    if (start >= meta.size || start > end) {
      headers.set("content-range", `bytes */${meta.size}`);
      return new NextResponse(null, { status: 416, headers });
    }
    end = Math.min(end, meta.size - 1);
    headers.set("content-range", `bytes ${start}-${end}/${meta.size}`);
    headers.set("content-length", String(end - start + 1));
    const stream = Readable.toWeb(localStream(pathname, { start, end })) as ReadableStream;
    return new NextResponse(stream, { status: 206, headers });
  }
  headers.set("content-length", String(meta.size));
  return new NextResponse(Readable.toWeb(localStream(pathname)) as ReadableStream, {
    status: 200,
    headers,
  });
}
