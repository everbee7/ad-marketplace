// Windows service entry point (run by NSSM, ADR-0007): `node scripts/ops/serve.mjs`.
// Loads the production env file and runs `next start` on PORT (default 80) for all interfaces.

import { spawn } from "node:child_process";
import path from "node:path";

import { productionEnv } from "./env-file.mjs";

const env = productionEnv();
const port = env.PORT ?? "80";
const host = env.HOSTNAME_BIND ?? "0.0.0.0";

const child = spawn(
  process.execPath,
  [path.join("node_modules", "next", "dist", "bin", "next"), "start", "-p", port, "-H", host],
  {
    env,
    stdio: "inherit",
  },
);

const stop = () => child.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 1));
