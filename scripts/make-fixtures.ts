// Generates tiny media fixtures in tests/fixtures/media with ffmpeg-static.
// Media never goes into git (.gitignore + security.yml), so tests create them on demand.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import ffmpegPath from "ffmpeg-static";

export const FIXTURE_DIR = path.join(process.cwd(), "tests", "fixtures", "media");

type Fixture = { file: string; args: string[] };

const src = (w: number, h: number, sec: number, rate = 30) => [
  "-f",
  "lavfi",
  "-i",
  `testsrc2=size=${w}x${h}:rate=${rate}:duration=${sec}`,
  "-f",
  "lavfi",
  "-i",
  `sine=frequency=880:duration=${sec}`,
];
const h264 = [
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-preset",
  "ultrafast",
  "-tag:v",
  "avc1",
  "-c:a",
  "aac",
  "-b:a",
  "64k",
  "-movflags",
  "+faststart",
  "-shortest",
];

export const FIXTURES: Fixture[] = [
  { file: "ad-1s-vertical.mp4", args: [...src(360, 640, 1), ...h264] },
  { file: "ad-1.5s-horizontal.mp4", args: [...src(640, 360, 1.5), ...h264] },
  { file: "ad-0.8s-square.mp4", args: [...src(480, 480, 0.8), ...h264] },
  { file: "ad-3s-too-long.mp4", args: [...src(360, 640, 3), ...h264] },
  { file: "ad-0.3s-too-short.mp4", args: [...src(360, 640, 0.3), ...h264] },
  {
    file: "ad-1s-hevc.mp4",
    args: [
      ...src(360, 640, 1),
      "-c:v",
      "libx265",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "ultrafast",
      "-tag:v",
      "hvc1",
      "-x265-params",
      "log-level=error",
      "-c:a",
      "aac",
      "-shortest",
    ],
  },
  { file: "video-10s.mp4", args: [...src(640, 360, 10), ...h264] },
  {
    file: "video-6s.webm",
    args: [
      ...src(640, 360, 6),
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "300k",
      "-deadline",
      "realtime",
      "-c:a",
      "libopus",
      "-shortest",
    ],
  },
];

export function makeFixtures(force = false): string[] {
  if (!ffmpegPath) throw new Error("ffmpeg-static binary is not available on this platform");
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const made: string[] = [];
  for (const f of FIXTURES) {
    const out = path.join(FIXTURE_DIR, f.file);
    if (!force && existsSync(out)) continue;
    execFileSync(ffmpegPath, ["-y", "-loglevel", "error", ...f.args, out], { stdio: "inherit" });
    made.push(f.file);
  }
  // Poster frames (JPEG) for seeds and tests that need a real image.
  for (const f of FIXTURES) {
    const poster = path.join(FIXTURE_DIR, posterName(f.file));
    if (!force && existsSync(poster)) continue;
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-loglevel",
        "error",
        "-ss",
        "0.1",
        "-i",
        path.join(FIXTURE_DIR, f.file),
        "-frames:v",
        "1",
        "-q:v",
        "4",
        poster,
      ],
      { stdio: "inherit" },
    );
    made.push(posterName(f.file));
  }
  return made;
}

export function posterName(file: string) {
  return file.replace(/.[a-z0-9]+$/i, ".jpg");
}

const invokedDirectly = process.argv[1] && /make-fixtures\.[tj]s$/.test(process.argv[1]);
if (invokedDirectly) {
  const made = makeFixtures(process.argv.includes("--force"));
  console.info(made.length ? `Created: ${made.join(", ")}` : "Fixtures already exist.");
}
