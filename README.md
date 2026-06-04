# DevMap

**GitHub-verified developer skill maps.** Connect GitHub, get a public profile at `/u/yourhandle` showing what you've actually shipped — verified from real repos, not self-reported.

---

## What it does

- Scans your GitHub repos and detects 50+ technologies from `package.json`, Dockerfiles, CI workflows, and more
- Builds a verified skill map — each skill links to the repos that prove it
- Auto-syncs via GitHub webhooks on every push
- Public profile at `/u/handle` with OG previews for Slack/Twitter
- Weekly email digest + skills-updated notifications
- README badge: `[![DevMap](https://yourhost/api/trees/badge/handle)](https://yourhost/u/handle)`
- Skill gap tracker — declare a target role, see which required skills you have vs. missing
- Compare any two devs — side-by-side diff of skills each one has, only counting techs used in 2+ repos (minimum familiar)
- Explore page to discover other devs

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
| `FRONTEND_URL` / `BACKEND_URL` | yes | Public URLs |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | yes | GitHub OAuth login |
| `GITHUB_CALLBACK_URL` | yes | OAuth redirect |
| `GITHUB_WEBHOOK_SECRET` | recommended | Webhook HMAC verification |
| `RESEND_API_KEY` | optional | Email digest + skills-updated emails |
| `OPENAI_API_KEY` | optional | AI skill inference (JD matcher) |

See `.env.example` and `docs/DEPLOYMENT_INSTRUCTIONS.md` for the full list.

---

## Docs

- [Project Context](docs/PROJECT_CONTEXT.md)
- [Deployment](docs/DEPLOYMENT_INSTRUCTIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Agent Guidelines](docs/AGENTS.md)
