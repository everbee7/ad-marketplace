// Self-hosted ops (ADR-0007): production settings live in the repo's gitignored
// .env.production.local, loaded the same way Next loads them for `next build` / `next start`.

import nextEnv from "@next/env";

/** Returns process.env plus the production .env files (.env.production.local wins). */
export function productionEnv() {
  const { combinedEnv } = nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  return { ...combinedEnv, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
}
