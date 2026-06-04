# AGENTS.md

Guidance for AI coding agents working in this repo.

## Main Workflow

Inspect → plan briefly → implement → verify → summarize.

- Read the relevant files before touching code.
- State a short plan before non-trivial edits.
- Keep changes scoped to what was asked.
- Run lint or type-check after edits when practical.
- Summarize changed files, behavior, and any verification run.

## Repo Basics

- Monorepo: Nx
- Package manager: npm
- Frontend: Angular 18 — `apps/frontend/frontend`
- Backend: NestJS — `apps/backend/backend`
- Database: Prisma + PostgreSQL — `prisma/`
- Runtime/deploy: Docker Compose

## Important Files

```
apps/frontend/frontend/src/app/
  auth.service.ts              — JWT, isGuest$, handle$, loadMe()
  trees.service.ts             — tree/profile/badge/explore API client
  nodes.service.ts             — node CRUD client
  app-config.ts                — runtime API URL
  shared/data/role-profiles.ts — target role skill lists
  landing/landing/             — marketing page
  dashboard/dashboard/         — main user area
  canvas/canvas/               — interactive skill map
  profile/profile/             — public profile page
  explore/                     — discovery feed

apps/backend/backend/src/app/
  auth/                        — GitHub/Google/Discord OAuth, JWT, guest
  trees/                       — CRUD, profile, badge SVG, OG page, explore, views, skill gap
  nodes/                       — node CRUD
  github/                      — GitHub API sync, webhook receiver
  email/                       — Resend email, weekly digest cron
  prisma/                      — Prisma client service
  config/                      — env helpers (use these, never process.env directly)

prisma/schema.prisma           — source of truth for DB schema
```

## Commands

Install:
```sh
npm ci
```

Dev (hybrid — local backend + Angular dev server, fastest):
```sh
npm run dev:fast
```

Dev (full Docker):
```sh
npm run dev
npm run dev:down
```

Build:
```sh
npx nx build frontend-frontend
npx nx build backend-backend
```

Lint:
```sh
npx nx lint frontend-frontend
npx nx lint backend-backend
```

Type-check frontend:
```sh
npx nx run frontend-frontend:type-check
```

Prisma (always set DATABASE_URL or use local port):
```sh
npx prisma db push        # sync schema to DB (dev)
npx prisma generate       # regenerate client after schema change
npx prisma migrate deploy # apply migrations (prod)
```

Production:
```sh
npm run prod
npm run prod:down
./deploy.sh
```

## Verification Rules

- After backend changes: run `npx nx lint backend-backend` or the build target.
- After frontend changes: run `npx nx run frontend-frontend:type-check`.
- After any Prisma schema change: run `prisma generate` **and** `prisma db push` (dev) or `prisma migrate deploy` (prod). The build will fail if the Prisma client is stale.
- After Docker/deploy changes: run `docker compose config` with the relevant env file.
- If a command can't run due to missing env/secrets, say so explicitly in the summary.

## Code Quality Rules

- Follow existing Angular/NestJS/Nx patterns in the file you're editing.
- Keep changes local to what was asked — no opportunistic cleanup.
- No new frameworks or large abstractions without a clear reason.
- Use typed DTOs/interfaces at API boundaries — avoid `any`.
- Frontend runtime URLs come from `app-config.ts` — never hardcode hosts.
- Backend config comes from env helpers in `src/app/config` — never read `process.env` directly in controllers or services.
- Do not log secrets, API keys, tokens, or full env contents.
- Comments only when the WHY is non-obvious.

## Do Not Touch Without Reason

- Real env files: `.env`, `.env.production`, `.env.local`
- Generated/build/cache: `dist/`, `.nx/`, `.angular/`, `node_modules/`
- Existing Prisma migrations (unless the task is specifically about migrations)
- Docker/deploy scripts (unless the task affects runtime or deployment)
- Auth/OAuth flow (unless the task explicitly involves login/session behavior)
- AI prompts/models (unless the task explicitly involves generation)

## Current Gotchas

- **Prisma client must be regenerated** after any `schema.prisma` change — `prisma generate`. Forgetting this causes TS2339 build errors.
- **`rawBody: true`** is passed to `NestFactory.create()` — required for GitHub webhook HMAC verification. Do not remove it.
- GitHub OAuth scope includes `admin:repo_hook` for webhook registration. Users who authed before this scope was added need to re-auth.
- AI generation uses OpenAI only (`OPENAI_API_KEY`, `AI_OPENAI_MODEL`).
- JD matcher AI endpoint is rate-limited via `@nestjs/throttler` (5 req/min per client).
- Global `ValidationPipe` (`whitelist: true, transform: true`) is active — request bodies must match DTOs.
- Guest users can use the app but are blocked from AI generation and GitHub sync.
- `EmailService` and `DigestService` skip gracefully when `RESEND_API_KEY` is not set.
