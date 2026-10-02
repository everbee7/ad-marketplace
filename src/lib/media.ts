import { createFile, Log, MP4BoxBuffer, type Movie } from "mp4box";

import { HEVC_CODECS, limits } from "@/config/limits";

// Media inspection shared by the browser (pre-checks) and the server (re-verification of ads).
// ARCHITECTURE §7.1. No transcoding: we only read the MP4/MOV header (mp4box).

Log.setLogLevel(Log.error);

export type Probe = {
  /** Four-character code of the video track, e.g. "avc1", "hvc1". */
  codec: string;
  codecString: string;
  durationSec: number;
  width: number;
  height: number;
};

export type ByteSource = {
  size: number;
  read: (start: number, end: number) => Promise<ArrayBuffer>;
};

export class MediaProbeError extends Error {
  constructor(message = "unreadable") {
    super(message);
    this.name = "MediaProbeError";
  }
}

const CHUNK = 1024 * 1024;

/** Reads MP4/MOV boxes chunk by chunk until the movie header is parsed (works for moov at start or end). */
export async function probeMp4(source: ByteSource): Promise<Probe> {
  const file = createFile();
  let info: Movie | null = null;
  let failed = false;
  file.onReady = (i) => {
    info = i;
  };
  file.onError = () => {
    failed = true;
  };

  let offset = 0;
  while (!info && !failed && offset < source.size) {
    const end = Math.min(offset + CHUNK, source.size);
    const chunk = await source.read(offset, end);
    const buf = MP4BoxBuffer.fromArrayBuffer(chunk, offset);
    try {
      const next = file.appendBuffer(buf);
      offset = typeof next === "number" && next > offset ? next : end;
    } catch {
      failed = true;
    }
  }
  if (!info && !failed) file.flush();
  const movie = info as Movie | null;
  const track = movie?.videoTracks?.[0];
  if (!movie || !track) throw new MediaProbeError();
  const durationSec =
    track.duration && track.timescale
      ? track.duration / track.timescale
      : movie.duration / movie.timescale;
  return {
    codec: track.codec.split(".")[0] ?? track.codec,
    codecString: track.codec,
    durationSec: Math.round(durationSec * 1000) / 1000,
    width: track.video?.width ?? track.track_width,
    height: track.video?.height ?? track.track_height,
  };
}

export function bufferSource(buf: ArrayBuffer | Uint8Array): ByteSource {
  const ab =
    buf instanceof Uint8Array
      ? (buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer)
      : buf;
  return { size: ab.byteLength, read: async (s, e) => ab.slice(s, e) };
}

export function blobSource(blob: Blob): ByteSource {
  return { size: blob.size, read: (s, e) => blob.slice(s, e).arrayBuffer() };
}

// --- PRD messages (AD-01 AC1/AC5, VID-01) -----------------------------------------------------

export const MEDIA_MESSAGES = {
  hevc: "This video format isn't supported. Please export it as MP4 (H.264) and try again.",
  unreadable: "We couldn't read this video. Please export it as MP4 (H.264) and try again.",
  adType: "Burst ads must be MP4 or MOV files.",
  adSize: "Burst ads must be 50 MB or smaller.",
  adDuration: "Burst ads must be 0.5–2 seconds long.",
  videoType: "Videos must be MP4, MOV or WebM files.",
  videoSize: "Videos must be 2 GB or smaller.",
  videoDuration: "Videos must be 15 minutes or shorter.",
} as const;

export function isHevc(codec: string) {
  return (HEVC_CODECS as readonly string[]).includes(codec);
}

export function adDurationOk(sec: number) {
  const { minDurationSec, maxDurationSec, durationToleranceSec } = limits.ad;
  return (
    sec >= minDurationSec - durationToleranceSec && sec <= maxDurationSec + durationToleranceSec
  );
}

/** Container and size check before reading any bytes. Returns a PRD message or null. */
export function adFileProblem(file: { type: string; size: number; name?: string }): string | null {
  const type = file.type || (file.name?.toLowerCase().endsWith(".mov") ? "video/quicktime" : "");
  if (!(limits.ad.containers as readonly string[]).includes(type)) return MEDIA_MESSAGES.adType;
  if (file.size > limits.ad.maxSizeBytes) return MEDIA_MESSAGES.adSize;
  return null;
}

/** Codec and duration check on a probe (browser and server). */
export function adProbeProblem(p: Probe): string | null {
  if (isHevc(p.codec)) return MEDIA_MESSAGES.hevc;
  if (!(limits.ad.codecs as readonly string[]).includes(p.codec)) return MEDIA_MESSAGES.hevc;
  if (!adDurationOk(p.durationSec)) return MEDIA_MESSAGES.adDuration;
  return null;
}

export function videoFileProblem(file: {
  type: string;
  size: number;
  name?: string;
}): string | null {
  const name = file.name?.toLowerCase() ?? "";
  const type =
    file.type ||
    (name.endsWith(".mov") ? "video/quicktime" : name.endsWith(".webm") ? "video/webm" : "");
  if (!(limits.creatorVideo.containers as readonly string[]).includes(type))
    return MEDIA_MESSAGES.videoType;
  if (file.size > limits.creatorVideo.maxSizeBytes) return MEDIA_MESSAGES.videoSize;
  return null;
}

export function videoProbeProblem(p: Pick<Probe, "codec" | "durationSec">): string | null {
  if (isHevc(p.codec)) return MEDIA_MESSAGES.hevc;
  if (!(limits.creatorVideo.codecs as readonly string[]).includes(p.codec))
    return MEDIA_MESSAGES.hevc;
  if (p.durationSec <= 0 || p.durationSec > limits.creatorVideo.maxDurationSec)
    return MEDIA_MESSAGES.videoDuration;
  return null;
}
