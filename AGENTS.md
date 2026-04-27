# AGENTS.md

Guidance for AI coding agents working in this repo.

## Main Workflow

Inspect -> plan briefly -> implement -> test -> summarize.

- Inspect the relevant files before changing code.
- State a short plan before non-trivial edits.
- Keep changes scoped to the user request.
- Run the smallest useful verification after edits.
- Summarize changed files, behavior, and verification results.

## Repo Basics

- Monorepo: Nx
- Package manager: npm
- Frontend: Angular app in `apps/frontend/frontend`
- Backend: NestJS app in `apps/backend/backend`
- Database: Prisma + PostgreSQL in `prisma`
- Runtime/deploy: Docker Compose

## Important Folders And Files

- `apps/frontend/frontend/src/app`: Angular app code
- `apps/frontend/frontend/src/app/canvas/canvas`: main skill tree UI
- `apps/frontend/frontend/src/app/trees.service.ts`: tree API client
- `apps/frontend/frontend/src/app/nodes.service.ts`: node API client
- `apps/frontend/frontend/src/app/app-config.ts`: runtime frontend config
- `apps/backend/backend/src/app`: NestJS app code
- `apps/backend/backend/src/app/trees`: tree CRUD, AI generation, batch jobs
- `apps/backend/backend/src/app/nodes`: node CRUD and activity
- `apps/backend/backend/src/app/auth`: auth, OAuth, JWT
- `apps/backend/backend/src/app/prisma`: Prisma service/module
- `prisma/schema.prisma`: Prisma schema
- `prisma/migrations`: database migrations
- `docker-compose.yml`: shared dev/prod services
- `docker-compose.dev.yml`: dev-only Postgres port publishing
- `Dockerfile.backend`, `Dockerfile.frontend`: container builds
- `deploy.sh`: production deploy entrypoint
- `scripts/dev-up.sh`, `scripts/dev-down.sh`: Docker dev workflow
- `.env.example`, `.env.production.example`: env templates only

## Commands

Install:

```sh
npm ci
```

Use `npm install` only when intentionally updating `package-lock.json`.

Dev:

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

Unit tests:

```sh
npx nx test frontend-frontend
npx nx test backend-backend
```

E2E:

```sh
npx nx e2e frontend-frontend-e2e
npx nx e2e backend-backend-e2e
```

Production deploy:

```sh
npm run prod
npm run prod:down
```

## Verification Rules

- For frontend UI changes, run the relevant frontend test or lint target when practical.
- For backend logic changes, run the matching backend unit test target.
- For Prisma/schema changes, inspect migrations and verify generated client assumptions.
- For Docker/deploy changes, run `docker compose config` with the relevant env file when available.
- If a command cannot be run because env, Docker, network, or secrets are missing, say so in the summary.

## Code Quality Rules

- Follow existing Angular/NestJS/Nx patterns.
- Keep edits local to the requested behavior.
- Do not introduce new frameworks or large abstractions without a clear reason.
- Prefer typed DTOs/interfaces over `any` when touching API boundaries.
- Keep frontend runtime URLs based on `app-config.js`, not hardcoded hosts.
- Keep backend config based on env helpers in `apps/backend/backend/src/app/config`.
- Do not log secrets, API keys, tokens, or full env contents.
- Keep comments rare and useful.

## Do Not Touch Without Reason

- Real env files: `.env`, `.env.production`, `.env.local`, `.env.*.local`
- Generated/build/cache folders: `dist`, `.nx`, `.angular`, `node_modules`
- Existing Prisma migrations unless the task is specifically about migrations
- Docker/deploy scripts unless the task affects runtime or deployment
- Auth/OAuth flow unless the task explicitly involves login/session behavior
- AI prompts/models unless the task explicitly involves generation behavior
- User or unrelated uncommitted changes

## Current Important Gotchas

- Migration `20260405120000_add_node_requirements_json` adds `Node.requirements`, but `prisma/schema.prisma` currently does not list that field.
- Env examples include Gemini variables, but current `AiService` only attempts OpenAI.
- Batch node-description generation uses `AI_BATCH_OPENAI_MODEL`, which is not currently listed in the env example files.
- Guest users are allowed into the app but blocked from AI generation.
