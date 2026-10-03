import { z } from "zod";

// The only place that reads process.env (AGENTS.md). Canonical list: .env.example.
// Validation is lazy so `next build` works without runtime secrets. Errors name the variable, never its value.

const bool = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const serverSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    MONGODB_URI: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url().optional(),
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    STORAGE_DRIVER: z.enum(["local", "blob"]).default("local"),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    EMAIL_TRANSPORT: z.enum(["console", "smtp"]).default("console"),
    EMAIL_FROM: z.string().default("Flashd <no-reply@flashd.local>"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: bool,
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    CRON_SECRET: z.string().min(16),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    /** E2E only: a production build (`next start`) may use the local storage driver and write the console-email outbox. Never set on Vercel. */
    E2E_MODE: bool,
  })
  .superRefine((e, ctx) => {
    if (e.STORAGE_DRIVER === "blob" && !e.BLOB_READ_WRITE_TOKEN) {
      ctx.addIssue({
        code: "custom",
        path: ["BLOB_READ_WRITE_TOKEN"],
        message: "required when STORAGE_DRIVER=blob",
      });
    }
    if (e.EMAIL_TRANSPORT === "smtp" && !e.SMTP_HOST) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "required when EMAIL_TRANSPORT=smtp",
      });
    }
    if (e.NODE_ENV === "production" && e.STORAGE_DRIVER === "local" && !e.E2E_MODE) {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_DRIVER"],
        message: "local driver is refused in production",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverSchema>;

function describe(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

let cached: ServerEnv | undefined;

function loadServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables were read in the browser.");
  }
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables (see .env.example):\n${describe(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** Server-side environment. Validated on first access. */
export const env = new Proxy({} as ServerEnv, {
  get(_target, key: string) {
    return loadServerEnv()[key as keyof ServerEnv];
  },
});

/** Values that may reach the browser. Next.js inlines `process.env.NEXT_PUBLIC_*` literals at build time. */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

/** For tests: forget the cached env after changing process.env. */
export function resetEnvCache() {
  cached = undefined;
}
