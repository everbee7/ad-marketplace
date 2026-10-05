// Runs a command with the production env loaded, e.g.
//   node scripts/ops/with-env.mjs npx tsx --conditions=react-server scripts/seed-admin.ts <email> <password>
//   node scripts/ops/with-env.mjs npm run build

import { spawnSync } from "node:child_process";

import { productionEnv } from "./env-file.mjs";

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("usage: node scripts/ops/with-env.mjs <command> [...args]");
  process.exit(1);
}
const res = spawnSync(cmd, args, {
  env: productionEnv(),
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(res.status ?? 1);
