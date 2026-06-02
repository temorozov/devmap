# Project Context

## Product

Skill Tree is a web app for creating visual learning trees. Users can create trees, add and edit skill nodes, track node progress, open a demo tree, share trees by token, and generate tree branches with AI. Guest users can enter the app, but AI generation endpoints reject guest users.

## Целевая аудитория
Люди которые хотят изучить новую сферу , которым нужен интерактивный и простой roadmap , и важен процесс геймификации развития . Проблемы которые решает сайт: .Они не знают с чего начать, в обычных роадмапах все сложно и непонятно, хочется простой и игровой вариант

## Stack

- Monorepo: Nx
- Package manager: npm (`package-lock.json`)
- Frontend: Angular 18, standalone components, SCSS, Jest, Playwright e2e
- Backend: NestJS 10, Jest
- Database: PostgreSQL + Prisma 7 with `@prisma/adapter-pg`
- Runtime/deploy: Docker Compose, nginx for frontend

## Frontend Structure

- App root: `apps/frontend/frontend`
- Routes: `login`, `dashboard`, `tree/:id`
- Main areas:
  - `login/login`: guest, Google, and Discord login UI
  - `dashboard/dashboard`: tree list, create/delete, share link, demo tree entry
  - `canvas/canvas`: visual skill tree editor, AI prompt modal, node interactions
  - `canvas/activity-calendar`: activity display
  - `shared/services/i18n.service.ts`: English/Russian/Ukrainian UI strings
  - `shared/components/dialog`: app dialog UI
- API URLs come from runtime `app-config.js`, generated in the frontend container from env vars. Local fallback uses the browser origin when runtime config is absent.

## Backend Structure

- App root: `apps/backend/backend`
- Main modules:
  - `auth`: guest auth, Google OAuth, Discord OAuth, JWT auth
  - `trees`: tree CRUD, shared tree lookup, AI generation, OpenAI batch jobs
  - `nodes`: node CRUD and activity recording
  - `prisma`: Prisma client service
  - `email`: Resend-backed email service
- Backend uses global API prefix: `/api`.
- CORS origins and public URLs are read from env.

## Database Overview

Prisma schema lives in `prisma/schema.prisma`; migrations live in `prisma/migrations`.

Main entities:

- `User`: guest/OAuth users, optional email, Google ID, Discord ID
- `Tree`: user-owned skill tree with optional `sharedToken`
- `Node`: tree node with parent/child links, title, description, icon, position, progress, level, max level
- `TreeActivity`: per-tree daily activity counts
- `AiBatchJob`: tracks OpenAI batch jobs for background node description generation

The short-lived `Node.requirements` field was removed: migration `20260602000000_drop_node_requirements` drops the column so the schema and database stay in sync.

## AI Generation Flow

Frontend flow:

- `CanvasComponent` opens the AI prompt modal.
- `TreesService.generateTree()` posts to `/api/trees/:id/generate`.

Backend flow:

- `TreesController.generate()` requires JWT auth and rejects guest users.
- `TreesService.generateSkillTree()` verifies tree ownership.
- `AiService.generateSkillTree()` calls OpenAI Responses API.
- The expected AI response is a JSON array of skills:
  - `title`
  - `description`
  - `icon`
  - `parentIndex`
  - optional `youtubeSearchQuery`
- Optional YouTube enrichment appends a recommended video link to the description when `YOUTUBE_API_KEY` is set.
- Generated skills are saved as `Node` rows in a Prisma transaction.
- Node positions are calculated by depth and sibling count.

There is also a separate background flow in `BatchGenerationService`:

- `POST /api/trees/:id/batch/descriptions`
- creates JSONL requests for existing nodes
- uploads them to OpenAI Files
- creates an OpenAI Batch for `/v1/responses`
- syncs/applies results through `/api/trees/batch-jobs/:jobId/sync`

## Docker And Deploy Notes

- Dev entry: `npm run dev` or `npm run dev:up`
- Dev stop: `npm run dev:down`
- Prod entry: `npm run prod` or `./deploy.sh`
- Prod stop: `npm run prod:down`
- Dev uses `docker-compose.yml` plus `docker-compose.dev.yml`.
- Prod uses only `docker-compose.yml`.
- `docker-compose.dev.yml` exposes Postgres through `POSTGRES_PORT`.
- Backend container runs `prisma migrate deploy` before starting `node main.js`.
- Frontend container serves Angular build through nginx.
- `app-config.js` is generated at container startup and is configured with no aggressive cache.
- Real `.env` and `.env.production` files are gitignored; templates are `.env.example` and `.env.production.example`.

## Confusing Or Important Parts

- AI generation uses OpenAI only. Gemini code and config were removed; env examples list `OPENAI_API_KEY`, `AI_OPENAI_MODEL`, and `AI_BATCH_OPENAI_MODEL`.
- Production example defaults `AI_OPENAI_MODEL` to `gpt-5.4-nano`; batch description generation uses `AI_BATCH_OPENAI_MODEL`.
- OAuth env values are optional; missing Google/Discord values should not prevent backend startup, but those login routes will not work.
- Shared tree route is `tree/:id` in the frontend; the component tries authenticated tree fetch first, then falls back to shared-token lookup.
- `dev-up.sh` and `dev-down.sh` contain extra logic for hosts where Docker denies normal stop/kill operations.
