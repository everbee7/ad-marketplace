// pm2 processes for the self-hosted server (ADR-0007), run from this repo folder:
//   pm2 start ecosystem.config.cjs && pm2 save
// Production settings come from .env.production.local (gitignored), which Next loads itself.
// nginx (ops/nginx/nginx.conf) listens on port 80 and proxies to the app on 127.0.0.1:APP_PORT.

// eslint-disable-next-line @typescript-eslint/no-require-imports -- pm2 loads this file as CommonJS
const path = require("node:path");

const APP_PORT = process.env.FLASHD_APP_PORT || "3001";
const NGINX_HOME = process.env.NGINX_HOME || "C:\\nginx";
const logs = path.join(__dirname, ".data", "logs");

module.exports = {
  apps: [
    {
      name: "flashd-web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // Localhost only: the public entry point is nginx.
      args: `start -p ${APP_PORT} -H 127.0.0.1`,
      env: { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      out_file: path.join(logs, "web.out.log"),
      error_file: path.join(logs, "web.err.log"),
      time: true,
    },
    {
      // Daily cleanup (replaces Vercel Cron): runs once, then pm2 relaunches it at 04:00.
      name: "flashd-cleanup",
      cwd: __dirname,
      script: "scripts/ops/cron-cleanup.mjs",
      env: { FLASHD_APP_PORT: APP_PORT },
      autorestart: false,
      cron_restart: "0 4 * * *",
      out_file: path.join(logs, "cleanup.log"),
      error_file: path.join(logs, "cleanup.log"),
      time: true,
    },
    {
      name: "nginx",
      cwd: NGINX_HOME,
      script: path.join(NGINX_HOME, "nginx.exe"),
      // -p keeps nginx's own logs/temp under NGINX_HOME; the config lives in the repo.
      args: ["-p", `${NGINX_HOME}\\`, "-c", path.join(__dirname, "ops", "nginx", "nginx.conf")],
      interpreter: "none",
      autorestart: true,
      out_file: path.join(logs, "nginx.out.log"),
      error_file: path.join(logs, "nginx.err.log"),
    },
  ],
};
