"use client";

import {
  adFileProblem,
  adProbeProblem,
  blobSource,
  MEDIA_MESSAGES,
  probeMp4,
  videoFileProblem,
  videoProbeProblem,
} from "@/lib/media";

// Browser pre-checks (ARCHITECTURE §7.2 step 1): type/size → mp4box (codec, duration) → <video>
// decode test → poster frame on a canvas. Nothing is uploaded until these pass.

export type InspectedVideo = {
  meta: {
    name: string;
    size: number;
    type: string;
    durationSec: number;
    width: number;
    height: number;
    codec: string;
  };
  poster: Blob;
};

export type InspectResult = { ok: true; video: InspectedVideo } | { ok: false; problem: string };

function normalizedType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mp4")) return "video/mp4";
  return "";
}

/** Loads the file in a hidden <video>, checks it decodes, and captures a JPEG poster frame. */
function decodeAndPoster(
  file: File,
): Promise<{ durationSec: number; width: number; height: number; poster: Blob }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const fail = () => {
      cleanup();
      reject(new Error("decode"));
    };
    const timer = window.setTimeout(fail, 20_000);
    video.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    video.onloadedmetadata = () => {
      const target = Number.isFinite(video.duration) ? Math.min(0.1, video.duration / 2) : 0;
      video.currentTime = target;
    };
    video.onseeked = () => {
      window.clearTimeout(timer);
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return fail();
      const scale = Math.min(1, 720 / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const durationSec = video.duration;
          cleanup();
          if (!blob) return reject(new Error("poster"));
          resolve({ durationSec, width, height, poster: blob });
        },
        "image/jpeg",
        0.85,
      );
    };
    video.src = url;
  });
}

export async function inspectVideoFile(
  file: File,
  kind: "ad" | "creatorVideo",
): Promise<InspectResult> {
  const type = normalizedType(file);
  const fileProblem =
    kind === "ad"
      ? adFileProblem({ type, size: file.size, name: file.name })
      : videoFileProblem({ type, size: file.size, name: file.name });
  if (fileProblem) return { ok: false, problem: fileProblem };

  let codec = "";
  let durationSec = 0;
  if (type !== "video/webm") {
    try {
      const probe = await probeMp4(blobSource(file));
      const problem = kind === "ad" ? adProbeProblem(probe) : videoProbeProblem(probe);
      if (problem) return { ok: false, problem };
      codec = probe.codec;
      durationSec = probe.durationSec;
    } catch {
      return { ok: false, problem: MEDIA_MESSAGES.unreadable };
    }
  }

  let decoded;
  try {
    decoded = await decodeAndPoster(file);
  } catch {
    // The browser can't play it (e.g. HEVC on Chrome): same message as AD-01 AC1.
    return { ok: false, problem: MEDIA_MESSAGES.hevc };
  }
  if (type === "video/webm") {
    codec = "vp09";
    durationSec = decoded.durationSec;
    const problem = videoProbeProblem({ codec, durationSec });
    if (problem) return { ok: false, problem };
  }
  return {
    ok: true,
    video: {
      meta: {
        name: file.name,
        size: file.size,
        type,
        durationSec,
        width: decoded.width,
        height: decoded.height,
        codec,
      },
      poster: decoded.poster,
    },
  };
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
