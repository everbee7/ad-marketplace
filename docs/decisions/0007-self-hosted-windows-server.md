# ADR-0007: Self-host on the client's Windows Server instead of Vercel

- **Status:** Accepted. Amends [ADR-0005](0005-lean-service-stack.md) (hosting, storage and cron move off Vercel; MongoDB Atlas stays)
- **Date:** 2026-10-05
- **Related:** ADR-0001, ADR-0005, ARCHITECTURE §1, §7, §10, §11; README "Deploying on Windows Server"

## Context
The client decided to run Flashd on their own Windows Server 2025 machine (public IP, no domain yet) rather than on Vercel. A Vercel build had failed because the app refused the `local` storage driver in production, a rule meant for Vercel's ephemeral filesystem.

## Decision
- **Where:** the app runs from the repo folder itself (`C:\Users\Administrator\Documents\ad-marketplace`). No separate deploy clone or data folder (revised the same day at the client's request; the first version used NSSM, `C:\flashd\app` and `C:\flashd-data`).
- **Processes:** **pm2** (`ecosystem.config.cjs`) runs `flashd-web` (`next start` on `127.0.0.1:3001`), `flashd-cleanup` (cron job, below) and `nginx`. `PM2_HOME=C:\ProgramData\pm2` (machine-wide), and the Task Scheduler task `Flashd pm2` runs `pm2 resurrect` as SYSTEM at boot (`scripts/ops/register-boot.ps1`).
- **Reverse proxy:** **nginx for Windows** in `C:\nginx`, with the config in the repo (`ops/nginx/nginx.conf`). It listens on port 80 (HTTP, by IP, until a domain exists), streams request/response bodies (2 GB uploads, Range playback) and forwards `X-Forwarded-*`.
- **Network:** Windows Firewall allows inbound TCP 80 only (rule `Flashd HTTP (80)`). The app port is bound to localhost.
- **Config:** production settings live in the gitignored `.env.production.local` in the repo folder. Next loads it for `next build` / `next start`, overriding `.env.local`; the ops scripts load it the same way (`@next/env`).
- **Storage:** the `local` driver is allowed in production; it is refused only when `VERCEL` is set. Files live in `STORAGE_LOCAL_DIR` (default `.data/uploads` in the repo, gitignored) and are served by `/api/dev-files` with Range support and the existing auth/path checks. Uploads stream to disk.
- **Database:** MongoDB Atlas (separate `flashd_prod` database). `MONGODB_DNS_SERVERS` adds resolvers for `mongodb+srv` lookups because this host's resolver refuses SRV queries.
- **Cron:** the pm2 app `flashd-cleanup` (`cron_restart: 0 4 * * *`) runs `scripts/ops/cron-cleanup.mjs`, which calls `/api/cron/cleanup` with the Bearer `CRON_SECRET`.
- **Email:** `console` transport until SMTP details are provided (verification links appear in `.data/logs/web.out.log`).
- **Deploys:** `node scripts/ops/deploy.mjs [branch]` in the repo folder: fast-forward pull, `pm2 stop flashd-web`, `npm ci` only when the lockfile changed, build, `pm2 startOrReload`, `pm2 save`.

## Alternatives considered
| Option | Pros | Cons | Why not |
| --- | --- | --- | --- |
| Keep Vercel + Blob | Managed, CDN, previews | Client chose own server | Client decision |
| IIS + iisnode / reverse proxy | Windows-native | More moving parts, iisnode unmaintained | Client asked for nginx + pm2 |
| NSSM service from a separate clone (first version) | Isolated from the dev checkout | Extra folders to manage | Client asked to deploy from the current source folder |
| MongoDB on the server | No external account | Needs a CPU with AVX for 7.x+, backups to run ourselves | Client chose the existing Atlas cluster |

## Consequences
- **HTTP only for now:** logins travel unencrypted until a domain + HTTPS (a `listen 443 ssl` server block in `ops/nginx/nginx.conf` with a certificate) is added. Do this before real users sign up.
- **Disk:** media fills `.data/uploads` on C:, which had ~5 GB free at setup. Move `STORAGE_LOCAL_DIR` to a larger disk (copy the folder, change the setting, `pm2 restart flashd-web`) before launch.
- **Shared folder:** dev work and production use the same checkout. Deploys switch it to the deployed branch, and a running `npm run dev` locks native modules (stop it before `npm ci`). The dev server keeps port 3000, while production uses 3001 behind nginx.
- Media bytes now pass through the Node process (no Vercel 4.5 MB body limit applies). Backups of `.data/uploads` and `.env.production.local` are the operator's job.
- The Vercel path still works: set `STORAGE_DRIVER=blob` and deploy to Vercel as in ADR-0005.
