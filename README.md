# DevMap

**Show your dev stack — beautifully, in one link.** Connect GitHub, get an editable map of the technologies you work with, and share a public profile at `/u/yourhandle` that recruiters and other devs can actually enjoy looking at.

---

## What it does

- **Draft from GitHub** — scans your repos and detects 50+ technologies from `package.json`, Dockerfiles, CI workflows, and more, then turns them into an editable starting point (not a locked-down verdict)
- **Edit freely** — add, remove, and level up any skill by hand. Your stack, your call. "Used in N repos" stays as a quiet badge, never a gate
- **Beautiful public profile** at `/u/handle` — a clean user card, an interactive skill map, and your stack grouped by category, with OG previews for Slack/Twitter
- **README badge** — drop `[![DevMap](https://yourhost/api/trees/badge/handle)](https://yourhost/u/handle)` into any README to render a live SVG of your stack
- **Refresh from GitHub** — a manual button re-scans your repos when you want, without clobbering your manual edits
- **Explore & compare** — search *any* public GitHub user on the fly (not just DevMap members) and, when logged in, diff their stack against yours side by side

## Stack

- **Frontend** — Angular 18, SCSS, OnPush
- **Backend** — NestJS 10
- **Database** — PostgreSQL + Prisma 7
- **Email** — Resend
- **Monorepo** — Nx
- **Runtime** — Docker Compose

---

## Commands

```sh
# Dev (local Node + Docker Postgres)
npm run dev        # start — frontend :4200, backend :3000/api
npm run dev:down   # stop Docker services

# Prod
npm run prod       # build + deploy
npm run prod:down  # stop

# Code
npm run format     # format all files
npm run lint       # lint
npm run test       # tests
```

`npm run prod` validates env, builds containers, runs `prisma migrate deploy` automatically.

> **First deploy:** `cp .env.production.example .env.production` and fill in the values.

---

## Key env vars

| Variable | Required | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | yes | JWT signing |
| `DATABASE_URL` | yes | Postgres connection |
| `FRONTEND_URL` / `BACKEND_URL` | yes | Public URLs (badge + OG image links) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | yes | GitHub OAuth login + repo scanning |
| `GITHUB_CALLBACK_URL` | yes | OAuth redirect |
| `RESEND_API_KEY` | optional | Email (degrades gracefully without it) |

See `.env.example` and `docs/DEPLOYMENT_INSTRUCTIONS.md` for the full list.

---

## Docs

- [Project Context](docs/PROJECT_CONTEXT.md)
- [Deployment](docs/DEPLOYMENT_INSTRUCTIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Agent Guidelines](docs/AGENTS.md)
