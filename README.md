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
- Explore page to discover other devs

## Stack

- **Frontend** — Angular 18, SCSS, OnPush
- **Backend** — NestJS 10
- **Database** — PostgreSQL + Prisma 7
- **Email** — Resend
- **Monorepo** — Nx
- **Runtime** — Docker Compose

---

## Local development

Fastest (local Node processes, Docker only for Postgres):

```sh
npm run dev:fast
```

Frontend: `http://localhost:4200` — Backend: `http://localhost:3000/api`

Full Docker:

```sh
npm run dev
npm run dev:down
```

---

## Production deploy

```sh
cp .env.production.example .env.production
# fill in .env.production
./deploy.sh
```

`deploy.sh` validates env, checks compose config, builds containers, and runs `prisma migrate deploy` automatically.

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
| `OPENAI_API_KEY` | optional | AI skill map generation |
| `GOOGLE_*` / `DISCORD_*` | optional | Additional OAuth providers |

See `.env.example` and `docs/DEPLOYMENT_INSTRUCTIONS.md` for the full list.

---

## Docs

- [Project Context](docs/PROJECT_CONTEXT.md)
- [Deployment](docs/DEPLOYMENT_INSTRUCTIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Agent Guidelines](docs/AGENTS.md)
