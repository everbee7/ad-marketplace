# Git Workflow

Staging-based flow. `main` and `staging` are both long-lived and protected. All work happens on short-lived feature branches cut from `staging`.

## Branches

- `main`: production, always deployable. Protected: no direct pushes, no force-pushes. Only updated through a `staging` → `main` release PR. Vercel deploys it to **Production**.
- `staging`: the integration branch, protected like `main`. You branch from it, and feature PRs target it. Vercel deploys it to the **Staging** environment.
- Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`. Always branch from `staging`, never from `main`. Keep them small and short-lived. Split a milestone into several PRs along its requirement IDs rather than opening one giant PR. Every PR gets a Vercel **Preview** deployment.

## The flow

```
main ──────────────────────────────────────●──────────────  (release: staging → main PR)
                                            │
staging ──●───────●───────●───────●────────┤
          │       │       │       │
feat/x ───┘       │       │       │   (each feature branch: cut from staging,
     fix/y ───────┘       │       │    PR back into staging, squash-merge)
          chore/z ────────┘       │
               feat/w ────────────┘
```

1. Branch: `git checkout staging && git pull && git checkout -b feat/<slug>`.
2. Commit, push, and open a PR **into `staging`**. CI must pass and the Preview deploy must work. Squash-merge.
3. When `staging` holds a release-worthy, verified set of changes (milestone demo, E2E paths green on Staging), open **one PR from `staging` into `main`**. Merge it with a merge commit (`--no-ff`, not squashed).

> Bootstrap exception: the very first commit (docs and agent config) goes straight to `main`, then `staging` is created from it. From then on, no direct pushes.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), written for a reviewer who wasn't in the room:

```
<type>(<scope>): <summary, imperative mood, ≤72 cols, no trailing period>

<body: WHY this change was made, not what the diff shows.
Reference PRD requirement IDs (e.g. "Implements PRJ-03 AC1–AC2").
Call out trade-offs and follow-ups explicitly.>

Refs: PRJ-03
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`, `security`.
Scopes are feature/module names: `auth`, `profiles`, `ads`, `marketplace`, `videos`, `projects`, `preview`, `admin`, `uploads`, `db`, `ui`, `ci`, `docs`.

Checklist:
- The summary is a command ("add", "fix"), not a description ("added").
- The body says *why*.
- One logical change per commit. If the summary needs "and", split it.

Examples:
- `feat(preview): trigger bursts with requestVideoFrameCallback`. Body: `timeupdate` fires about every 250 ms, which misses PRV-01 AC3's ±100 ms target.
- `fix(uploads): re-verify ad duration on the server`. Body: client-reported duration can be spoofed, so finalizeUpload now parses the MP4 header to enforce AD-01 AC5.

## Pull requests

- Every change to `staging` or `main` goes through a PR.
- **Title:** `<type>(<scope>): <summary>`, ≤ 72 characters. Release PRs: `chore(release): <milestone/headline>`.
- **Description:** [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md) fills in automatically. Complete every section, or write `N/A, <reason>`.
- List the PRD requirement IDs the PR implements, and tick them in [ROADMAP.md](../product/ROADMAP.md) in the same PR.
- If the PR changes a collection schema, an endpoint, an env var or a limit, update [DATA_MODEL.md](DATA_MODEL.md), [API.md](API.md), `.env.example` or `src/config/limits.ts` + PRD §10 in the same PR and say so in the description.
- Feature → `staging`: squash-merge. `staging` → `main`: merge commit.

## CI/CD

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | every PR and push to `staging`/`main` | `npm ci` → lint → typecheck → unit/integration tests → build |
| `security.yml` | every PR to `staging`/`main` | `npm audit --audit-level=high`. Guard that fails if `.env*` (except `.env.example`) or media files (`*.mp4`, `*.mov`, `*.webm`) appear in the diff |
| `e2e.yml` | `deployment_status` success on Preview/Staging | Playwright smoke tests against the deployed URL |

**CD is Vercel's Git integration.** Actions never deploys and holds no Vercel tokens. Runtime secrets live in Vercel environment variables per environment, never in the repo or workflow YAML.

Branch protection on `main` and `staging` requires `ci` and `security` to pass. `e2e` is required for `staging` → `main`.

## Releases

Each `staging` → `main` merge is a release. Tag `main` as `v0.<milestone>.<n>` after the merge, and list the PRD IDs it delivered in the GitHub release notes.
