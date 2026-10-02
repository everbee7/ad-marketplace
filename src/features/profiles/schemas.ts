import { z } from "zod";

import { CATEGORIES } from "@/config/categories";
import { limits } from "@/config/limits";

// PRF-01 / PRF-02 profile inputs (business and creator).

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => v == null || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), {
    message: "Enter a full link starting with https://",
  })
  .transform((v) => v ?? null);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters.`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const imageUrl = z
  .string()
  .max(1000)
  .nullable()
  .optional()
  .transform((v) => v || null);

export const businessProfileSchema = z.object({
  role: z.literal("business"),
  companyName: z.string().trim().min(1, "Enter your company name.").max(100),
  logoUrl: imageUrl,
  website: optionalUrl,
  category: z.enum(CATEGORIES, { message: "Choose a category." }),
  description: optionalText(limits.text.shortDescriptionMax, "Description"),
});

export const creatorProfileSchema = z.object({
  role: z.literal("creator"),
  displayName: z.string().trim().min(1, "Enter your display name.").max(60),
  avatarUrl: imageUrl,
  niche: z.enum(CATEGORIES, { message: "Choose your niche." }),
  bio: optionalText(limits.text.shortDescriptionMax, "Bio"),
  youtube: optionalUrl,
  tiktok: optionalUrl,
  instagram: optionalUrl,
  other: optionalUrl,
});

export const profileSchema = z.discriminatedUnion("role", [
  businessProfileSchema,
  creatorProfileSchema,
]);
export type ProfileInput = z.input<typeof profileSchema>;
export type BusinessProfileInput = z.input<typeof businessProfileSchema>;
export type CreatorProfileInput = z.input<typeof creatorProfileSchema>;

/** Profile as the client sees it. */
export type ProfileDTO =
  | {
      role: "business";
      companyName: string;
      logoUrl: string | null;
      website: string | null;
      category: string;
      description: string | null;
    }
  | {
      role: "creator";
      displayName: string;
      avatarUrl: string | null;
      niche: string;
      bio: string | null;
      youtube: string | null;
      tiktok: string | null;
      instagram: string | null;
      other: string | null;
    };
