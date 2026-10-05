// Daily cleanup trigger for self-hosting (replaces Vercel Cron, ADR-0007). Scheduled by Windows
// Task Scheduler: calls /api/cron/cleanup on the local server with the Bearer CRON_SECRET.

import { loadEnvFile } from "./env-file.mjs";

const env = loadEnvFile();
const port = env.PORT ?? "80";
const res = await fetch(`http://127.0.0.1:${port}/api/cron/cleanup`, {
  headers: { authorization: `Bearer ${env.CRON_SECRET}` },
});
const body = await res.text();
console.info(new Date().toISOString(), res.status, body.slice(0, 300));
process.exit(res.ok ? 0 : 1);
