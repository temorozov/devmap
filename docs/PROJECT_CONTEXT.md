# Project Context

## Product

**DevMap** is a GitHub-verified developer skill map. Users connect GitHub, DevMap scans their repos and builds a public profile at `/u/handle` showing which technologies they've actually shipped — verified from `package.json`, Dockerfiles, CI workflows, and more.

The core loop:
1. User connects GitHub → repos scanned → "My Dev Map" tree built with verified nodes
2. Profile is public at `/u/handle` — shareable link, OG preview for Slack/Twitter
3. Webhooks auto-sync the map on every push, without user action
4. Weekly email digest and skills-updated email bring users back
5. README badge and explore page drive organic acquisition

## Stack

- Monorepo: Nx
- Package manager: npm (`package-lock.json`)
- Frontend: Angular 18, standalone components, SCSS, OnPush change detection
- Backend: NestJS 10
- Database: PostgreSQL + Prisma 7 with `@prisma/adapter-pg`
- Email: Resend (`RESEND_API_KEY`)
- Runtime/deploy: Docker Compose, nginx for frontend

## Frontend Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `LandingComponent` | Marketing page, shows Dashboard CTA when logged in |
| `/login` | `LoginComponent` | GitHub OAuth primary, Google/Discord optional |
| `/dashboard` | `DashboardComponent` | Trees list, GitHub sync, skill gap tracker, badge modal |
| `/tree/:id` | `CanvasComponent` | Interactive skill map editor |
| `/u/:handle` | `ProfileComponent` | Public profile with verified skills, target role, view stats |
| `/explore` | `ExploreComponent` | Discovery feed of recently active devs |

## Frontend Structure

- App root: `apps/frontend/frontend/src/app`
- `auth.service.ts` — JWT storage, `isGuest$`, `handle$`, `githubUsername$`, `loadMe()`
- `trees.service.ts` — tree/profile/badge/explore/stats API client
- `nodes.service.ts` — node CRUD
- `app-config.ts` — reads runtime `app-config.js` for API URL
- `shared/data/role-profiles.ts` — target role definitions (required/nice-to-have skills)
- `shared/data/demo-sample.ts` — demo tree ID

## Backend Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| `auth` | `src/app/auth` | GitHub/Google/Discord OAuth, guest auth, JWT |
| `trees` | `src/app/trees` | Tree CRUD, public profile, view counter, badge SVG, OG page, explore, skill gap |
| `nodes` | `src/app/nodes` | Node CRUD |
| `github` | `src/app/github` | GitHub API sync, webhook receiver |
| `email` | `src/app/email` | Weekly digest cron, skills-updated email (Resend) |
| `prisma` | `src/app/prisma` | Prisma client service |

Backend global prefix: `/api`

## Database Schema (key models)

- `User` — handle, githubUsername, githubAccessToken, targetRole, email, isGuest
- `Tree` — user-owned skill map with sharedToken
- `Node` — skill node: title, verified, source, evidence (JSON), icon, position
- `GitHubScan` — scan history with `summary` JSON (used for skills-updated diff)
- `GitHubWebhook` — registered webhook per repo (userId, repoFullName, webhookId)
- `ProfileView` — view log with viewerIpHash for 24h dedup
- `AiBatchJob` — OpenAI batch jobs for node description generation

## GitHub Sync Flow

1. User hits "Sync GitHub" → `POST /api/github/sync`
2. `GitHubSyncService.syncUserDevMap(userId)` fetches repos via GitHub API
3. `detectTechnologies()` reads package.json, Dockerfiles, CI files
4. Upserts nodes in "My Dev Map" tree as verified
5. Saves `GitHubScan` record with summary
6. Diffs against previous scan — if new skills found and user has email, sends skills-updated email
7. Registers webhooks on detected repos (requires `admin:repo_hook` scope + `GITHUB_WEBHOOK_SECRET` + non-localhost `BACKEND_URL`)

Webhook flow: GitHub `push` event → `POST /api/github/webhook` → HMAC-SHA256 verification → `syncByRepo(repoFullName)` → full sync for that user

## Key Env Vars

```
# Required
JWT_SECRET
DATABASE_URL
FRONTEND_URL
BACKEND_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_CALLBACK_URL

# Webhook (optional but needed for auto-sync)
GITHUB_WEBHOOK_SECRET

# Email (optional — features degrade gracefully without it)
RESEND_API_KEY

# AI generation (optional)
OPENAI_API_KEY
AI_OPENAI_MODEL
AI_BATCH_OPENAI_MODEL

# Optional OAuth providers
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL
DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_CALLBACK_URL
```

## Important Behavioral Details

- Frontend reads `API_URL` from runtime `app-config.js` — never hardcode hosts.
- Backend reads all config from env via helpers in `src/app/config`.
- GitHub OAuth scope includes `admin:repo_hook` for webhook registration. Users who authed before this scope was added need to re-auth.
- `rawBody: true` in `NestFactory.create()` — required for HMAC webhook verification.
- Profile view counter deduplicates by hashed IP within a 24h window.
- Weekly email digest runs via `@Cron('0 9 * * 1')` (Monday 9am UTC). Skipped if no `RESEND_API_KEY`.
- Skills-updated email fires only on re-syncs (not first sync) and only when new skills are detected.
- OG endpoint (`GET /api/trees/og/:handle`) is for social crawlers — configure Nginx to route Twitterbot/Slackbot there.
- `targetRole` is stored in DB and shown on public profile as a role badge + progress bar.
