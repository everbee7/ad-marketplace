// Starts an isolated stack for Playwright: in-memory MongoDB + a production build of the app
// (`next build` into .next-e2e, then `next start` on port 3100). Env vars set here take precedence
// over .env.local, so E2E never touches the dev database.
// A production build avoids `next dev` on-demand compilation, which made E2E flaky (transient
// 404s on nested routes, and preview timing skewed by compile load). Set E2E_DEV=1 to use `next dev`.

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { MongoMemoryReplSet } from "mongodb-memory-server";

const port = process.env.E2E_PORT ?? "3100";
const useDev = !!process.env.E2E_DEV;
const nextBin = path.join("node_modules", "next", "dist", "bin", "next");

const mongo = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
const uri = mongo.getUri("flashd_e2e");

mkdirSync(path.join(process.cwd(), ".data"), { recursive: true });
writeFileSync(
  path.join(process.cwd(), ".data", "e2e.json"),
  JSON.stringify({ mongoUri: uri, port }),
);

const env = {
  ...process.env,
  MONGODB_URI: uri,
  BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-012345",
  BETTER_AUTH_URL: `http://localhost:${port}`,
  NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
  STORAGE_DRIVER: "local",
  EMAIL_TRANSPORT: "console",
  CRON_SECRET: "e2e-cron-secret-0123456789",
  E2E_MODE: "1",
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_TELEMETRY_DISABLED: "1",
};

if (!useDev) {
  const build = spawnSync(process.execPath, [nextBin, "build"], {
    env: { ...env, NODE_ENV: "production" },
    stdio: "inherit",
  });
  if (build.status !== 0) {
    await mongo.stop();
    process.exit(build.status ?? 1);
  }
}

const next = spawn(process.execPath, [nextBin, useDev ? "dev" : "start", "-p", port], {
  env: { ...env, NODE_ENV: useDev ? "development" : "production" },
  stdio: "inherit",
});

const stop = async () => {
  next.kill();
  await mongo.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", async (code) => {
  await mongo.stop();
  process.exit(code ?? 0);
});
