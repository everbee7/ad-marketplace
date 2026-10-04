// Starts an isolated stack for Playwright: in-memory MongoDB + `next dev` on port 3100.
// Env vars set here take precedence over .env.local, so E2E never touches the dev database.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { MongoMemoryReplSet } from "mongodb-memory-server";

const port = process.env.E2E_PORT ?? "3100";
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
  NODE_ENV: "development",
  MONGODB_URI: uri,
  BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-012345",
  BETTER_AUTH_URL: `http://localhost:${port}`,
  NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
  STORAGE_DRIVER: "local",
  EMAIL_TRANSPORT: "console",
  CRON_SECRET: "e2e-cron-secret-0123456789",
  NEXT_TELEMETRY_DISABLED: "1",
};

const next = spawn(
  process.execPath,
  [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", port],
  { env, stdio: "inherit" },
);

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
