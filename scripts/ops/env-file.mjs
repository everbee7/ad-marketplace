// Self-hosted ops (ADR-0007): production settings live in a plain KEY=VALUE file outside the repo,
// by default C:\flashd-data\config\flashd.env (override with FLASHD_ENV_FILE).

import { readFileSync } from "node:fs";

export const ENV_FILE = process.env.FLASHD_ENV_FILE ?? "C:\\flashd-data\\config\\flashd.env";

/** Parses KEY=VALUE lines (# comments, optional surrounding quotes). Never logs values. */
export function loadEnvFile(file = ENV_FILE) {
  const out = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function productionEnv() {
  return { ...process.env, ...loadEnvFile(), NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
}
