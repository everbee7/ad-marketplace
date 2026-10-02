import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { makeFixtures } from "../../scripts/make-fixtures";

import { ADMIN } from "./helpers";

// Generates media fixtures and seeds the admin + demo business with live ads into the isolated E2E database started by
// scripts/e2e-server.mjs (its URI is written to .data/e2e.json).

export default async function globalSetup() {
  makeFixtures();
  if (process.env.E2E_BASE_URL) return; // deployed target: admin is seeded there separately
  const { mongoUri } = JSON.parse(
    readFileSync(path.join(process.cwd(), ".data", "e2e.json"), "utf8"),
  ) as {
    mongoUri: string;
  };
  execFileSync(
    process.execPath,
    [
      path.join("node_modules", "tsx", "dist", "cli.mjs"),
      "--conditions=react-server",
      "scripts/seed-demo.ts",
      ADMIN.email,
      ADMIN.password,
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        MONGODB_URI: mongoUri,
        BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-012345",
        CRON_SECRET: "e2e-cron-secret-0123456789",
        NODE_ENV: "development",
      },
    },
  );
}
