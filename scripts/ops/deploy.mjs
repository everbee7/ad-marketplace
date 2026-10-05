// Redeploy on the Windows server (ADR-0007), run from this repo folder:
//   node scripts/ops/deploy.mjs [branch]
// Pulls the branch (default: staging), stops the app (Windows locks native modules that npm ci
// must replace, and the build rewrites .next), reinstalls only if the lockfile changed, builds
// with the production env, then restarts the pm2 processes and saves the list for boot.

import { spawnSync } from "node:child_process";

import { productionEnv } from "./env-file.mjs";

const branch = process.argv[2] ?? "staging";

function run(cmd, args, env = process.env, { allowFail = false } = {}) {
  console.info(`> ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { env, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0 && !allowFail) {
    console.error(`Failed: ${cmd} ${args.join(" ")}`);
    process.exit(res.status ?? 1);
  }
}

function lockHash() {
  const res = spawnSync("git", ["rev-parse", "HEAD:package-lock.json"], { encoding: "utf8" });
  return res.stdout.trim();
}

const lockBefore = lockHash();
run("git", ["fetch", "origin", branch]);
run("git", ["checkout", branch]);
run("git", ["pull", "--ff-only", "origin", branch]);
// Not running yet on a first deploy, so a failure here is fine.
run("pm2", ["stop", "flashd-web"], process.env, { allowFail: true });
if (lockHash() !== lockBefore || process.argv.includes("--ci")) {
  // Dev dependencies are needed to build (Tailwind, TypeScript, shadcn CSS).
  run("npm", ["ci", "--no-audit", "--no-fund"], { ...process.env, NODE_ENV: "development" });
}
run("npm", ["run", "build"], productionEnv());
run("pm2", ["startOrReload", "ecosystem.config.cjs", "--update-env"]);
run("pm2", ["save"]);
console.info(`Deployed ${branch}.`);
