# Project Context

## Product

**DevMap** lets developers show their stack — beautifully, in one link. Users connect GitHub, DevMap scans their repos to *draft* a stack from the technologies it detects (`package.json`, Dockerfiles, CI workflows, and more), and the user then edits that draft freely. The result is a public profile at `/u/handle` with a clean card, an interactive skill map, and the stack grouped by category.

The GitHub scan is a **starting point, not a gate**: detected skills become editable nodes the user can add to, remove, or re-level. "Used in N repos" is shown as a quiet badge, never a requirement.

The core loop:
1. User connects GitHub → repos scanned → "My Dev Map" tree drafted with detected nodes
2. User edits the stack on the dashboard — add/remove skills, set levels; "Refresh from GitHub" re-scans on demand without clobbering manual edits
3. Profile is public at `/u/handle` — shareable link, README badge, OG preview for Slack/Twitter
4. Explore lets anyone scan any public GitHub user on the fly and compare stacks

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
| `/dashboard` | `DashboardComponent` | "My Stack" editor — GitHub refresh, add/remove/level skills, share link + badge modal |
| `/tree/:id` | `CanvasComponent` | Interactive skill map editor |
| `/u/:handle` | `ProfileComponent` | Public profile — user card + interactive skill map + grouped stack list |
| `/explore` | `ExploreComponent` | Scan any public GitHub user on the fly; compare against your stack when logged in |
| `/compare/**` | — | Redirects to `/explore` (compare is now a mode of Explore, not a route) |

## Frontend Structure

- App root: `apps/frontend/frontend/src/app`
- `auth.service.ts` — JWT storage, `isGuest$`, `handle$`, `githubUsername$`, `loadMe()`
- `trees.service.ts` — tree/profile/badge/explore API client; `scanUser(handle)` + `compareUsers(a,b)` for live GitHub scans
- `nodes.service.ts` — node CRUD
- `app-config.ts` — reads runtime `app-config.js` for API URL
- `shared/components/skill-graph/` — the interactive skill map rendering
- `shared/data/demo-sample.ts` — demo tree ID

## Backend Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| `auth` | `src/app/auth` | GitHub/Google/Discord OAuth, guest auth, JWT |
| `trees` | `src/app/trees` | Tree CRUD, public profile, badge SVG, OG page, explore + compare |
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

## GitHub Sync Flow

1. User hits "Refresh from GitHub" → `POST /api/github/sync`
2. `GitHubSyncService.syncUserDevMap(userId)` fetches repos via GitHub API
3. `detectTechnologies()` reads package.json, Dockerfiles, CI files
4. Upserts detected nodes in the "My Dev Map" tree (`source: github`) as an editable draft — existing manual edits are preserved
5. Saves `GitHubScan` record with summary (repo count + skill diff)

Guest / external scans: `GET /api/github/scan/:username` scans any public GitHub user on the fly (used by Explore + Compare). Results are cached briefly and reuse a connected user's token for GitHub rate limits.

Legacy infra still present in the backend: a webhook receiver (`POST /api/github/webhook`, HMAC-verified) and a weekly email digest cron. These are dormant relative to the current product flow (sync is now a manual refresh), kept for reference rather than featured.

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

# AI inference (optional — JD matcher; falls back to literal matching when unset)
OPENAI_API_KEY
AI_OPENAI_MODEL
AI_REQUEST_TIMEOUT_MS

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
- README badge is served at `GET /api/trees/badge/:handle` (note the `/trees` segment — the OG image and profile meta tags must point at this full path, not `/api/badge/...`).
- OG endpoint (`GET /api/trees/og/:handle`) is for social crawlers — configure Nginx to route Twitterbot/Slackbot there.
