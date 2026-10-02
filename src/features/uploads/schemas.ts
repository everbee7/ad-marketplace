import { z } from "zod";

import { IMAGE_KINDS } from "@/config/enums";
import { limits } from "@/config/limits";

// Upload inputs (ARCHITECTURE §7.2). Media is validated in the browser first, then re-checked on the server.

export const imageUploadSchema = z.object({
  kind: z.enum(IMAGE_KINDS),
  contentType: z.enum(limits.image.contentTypes, {
    message: "Images must be JPG, PNG or WebP.",
  }),
  size: z
    .number()
    .int()
    .positive()
    .max(limits.image.maxSizeBytes, { message: "Images must be 5 MB or smaller." }),
});
export type ImageUploadInput = z.input<typeof imageUploadSchema>;

/** What the browser needs to upload one file (storage-client.ts UploadTarget). */
export type UploadTargetDTO = { driver: "local" | "blob"; pathname: string; uploadKey: string };

export const IMAGE_ERROR = "Images must be JPG, PNG or WebP, up to 5 MB.";
