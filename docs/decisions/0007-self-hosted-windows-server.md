# ADR-0007: Self-host on the client's Windows Server instead of Vercel

- **Status:** Accepted. Amends [ADR-0005](0005-lean-service-stack.md) (hosting, storage and cron move off Vercel; MongoDB Atlas stays)
- **Date:** 2026-10-05
- **Related:** ADR-0001, ADR-0005, ARCHITECTURE §1, §7, §10, §11; README "Deploying on Windows Server"

## Context
The client decided to run Flashd on their own Windows Server 2025 machine (public IP, no domain yet) rather than on Vercel. A Vercel build had failed because the app refused the `local` storage driver in production, a rule meant for Vercel's ephemeral filesystem.

## Decision
- **Runtime:** `next build` + `next start` (Node 22+) on the server, run as a Windows service with **NSSM** (`scripts/ops/serve.mjs`), listening on port 80 (HTTP, by IP) until a domain exists.
- **Config:** production settings live in `C:\flashd-data\config\flashd.env` (outside the repo, admin-only ACL), loaded by the ops scripts. No `.env*` files in the deploy folder.
- **Storage:** the `local` driver is allowed in production; it is refused only when `VERCEL` is set. Files live in `STORAGE_LOCAL_DIR` (`C:\flashd-data\uploads`) and are served by `/api/dev-files` with Range support and the existing auth/path checks. Uploads stream to disk.
- **Database:** MongoDB Atlas (separate `flashd_prod` database). `MONGODB_DNS_SERVERS` adds resolvers for `mongodb+srv` lookups because this host's resolver refuses SRV queries.
- **Cron:** Windows Task Scheduler runs `scripts/ops/cron-cleanup.mjs` daily, which calls `/api/cron/cleanup` with the Bearer `CRON_SECRET`.
- **Email:** `console` transport until SMTP details are provided (verification links appear in the service log).
- **Deploys:** `scripts/ops/deploy.mjs` in `C:\flashd\app` (a clone of the repo): fast-forward pull, `npm ci`, build with the production env, `nssm restart Flashd`.

## Alternatives considered
| Option | Pros | Cons | Why not |
| --- | --- | --- | --- |
| Keep Vercel + Blob | Managed, CDN, previews | Client chose own server | Client decision |
| IIS + iisnode / reverse proxy | Windows-native | More moving parts, iisnode unmaintained | NSSM + `next start` is simpler; add Caddy/IIS as a reverse proxy when a domain + HTTPS arrive |
| MongoDB on the server | No external account | Needs a CPU with AVX for 7.x+, backups to run ourselves | Client chose the existing Atlas cluster |

## Consequences
- **HTTP only for now:** logins travel unencrypted until a domain + HTTPS (e.g. Caddy in front, automatic certificates) is added. Do this before real users sign up.
- **Disk:** media fills `C:\flashd-data`; C: had ~5 GB free at setup. Move `STORAGE_LOCAL_DIR` to a larger disk (copy the folder, change the setting, restart) before launch.
- Media bytes now pass through the Node process (no Vercel 4.5 MB body limit applies). Backups of `C:\flashd-data\uploads` are the operator's job.
- The Vercel path still works: set `STORAGE_DRIVER=blob` and deploy to Vercel as in ADR-0005.
