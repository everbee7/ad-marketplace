// Daily cleanup trigger for self-hosting (replaces Vercel Cron, ADR-0007). Run by pm2
// (`flashd-cleanup` in ecosystem.config.cjs): calls /api/cron/cleanup on the local app with the
// Bearer CRON_SECRET from the production env.

import { productionEnv } from "./env-file.mjs";

const env = productionEnv();
const port = env.FLASHD_APP_PORT ?? "3001";

// pm2 also runs this once at startup, possibly before the app listens: retry for up to 2 minutes.
let res;
for (let attempt = 1; !res; attempt++) {
  try {
    res = await fetch(`http://127.0.0.1:${port}/api/cron/cleanup`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
  } catch (err) {
    if (attempt >= 24) {
      console.error(new Date().toISOString(), "app unreachable:", err.cause?.code ?? err.message);
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
if (res) {
  const body = await res.text();
  console.info(new Date().toISOString(), res.status, body.slice(0, 300));
}
// Set exitCode instead of process.exit(): exiting while fetch handles close trips a libuv
// assertion on Windows.
process.exitCode = res?.ok ? 0 : 1;
