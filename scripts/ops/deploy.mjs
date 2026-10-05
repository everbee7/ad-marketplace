// Redeploy on the Windows server (ADR-0007), run from the app folder (C:\flashd\app):
//   node scripts/ops/deploy.mjs [branch]
// Pulls the branch (default: staging), stops the service (Windows locks native modules that npm ci
// must replace), installs, builds with the production env, then starts the service again.

import { spawnSync } from "node:child_process";

import { productionEnv } from "./env-file.mjs";

const branch = process.argv[2] ?? "staging";
const service = process.env.FLASHD_SERVICE ?? "Flashd";
const nssm = process.env.FLASHD_NSSM ?? "C:\\flashd\\bin\\nssm.exe";

function run(cmd, args, env = process.env) {
  console.info(`> ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { env, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) {
    console.error(`Failed: ${cmd} ${args.join(" ")}`);
    process.exit(res.status ?? 1);
  }
}

run("git", ["fetch", "origin", branch]);
run("git", ["checkout", branch]);
run("git", ["pull", "--ff-only", "origin", branch]);
run(nssm, ["stop", service]);
// Dev dependencies are needed to build (Tailwind, TypeScript, shadcn CSS).
run("npm", ["ci", "--no-audit", "--no-fund"], { ...process.env, NODE_ENV: "development" });
run("npm", ["run", "build"], productionEnv());
run(nssm, ["start", service]);
console.info(`Deployed ${branch}.`);
