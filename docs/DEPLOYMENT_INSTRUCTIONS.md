# Deployment Instructions

## 1. Prepare env file

On the server, create a production env file from the template:

```bash
cp .env.production.example .env.production
```

Fill in all required variables:

```
# App URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api
FRONTEND_PORT=80
BACKEND_PORT=3000
PORT=3000
API_URL=https://yourdomain.com/api
CORS_ORIGINS=https://yourdomain.com

# Database
POSTGRES_DB=devmap
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/devmap?schema=public

# Auth
JWT_SECRET=<random-256-bit-hex>

# GitHub OAuth (required for login)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=https://yourdomain.com/api/auth/github/callback

# GitHub Webhooks (required for auto-sync on push)
GITHUB_WEBHOOK_SECRET=<random-hex>

# Email (optional — digest and skills-updated emails)
RESEND_API_KEY=

# AI inference (optional — JD matcher skill extraction; falls back to literal matching when unset)
OPENAI_API_KEY=
AI_OPENAI_MODEL=gpt-4o-mini
AI_REQUEST_TIMEOUT_MS=30000

# Optional OAuth providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback
```

Optional integrations degrade gracefully — missing `RESEND_API_KEY` skips emails, missing `OPENAI_API_KEY` falls back to literal skill matching in the JD matcher, missing Google/Discord vars disable those login methods.

## 2. Deploy

```bash
./deploy.sh
```

The script:
- validates required variables in `.env.production`
- checks `docker compose` config
- builds and starts containers
- runs `prisma migrate deploy` automatically

You can also pass a custom env file:
```bash
./deploy.sh /path/to/custom.env
```

## 3. Useful commands

```bash
# Start / stop
npm run prod
npm run prod:down

# Logs
docker compose --env-file .env.production -f docker-compose.yml logs -f

# Status
docker compose --env-file .env.production -f docker-compose.yml ps
```

## 4. If backend can't connect to PostgreSQL

Prisma `P1000: Authentication failed` after a password change usually means an old Docker volume has the old password.

```bash
npm run prod:recreate-db
```

**Warning:** this drops the PostgreSQL volume and starts with an empty database.

## 5. Nginx config for OG/social previews

To make Slack/Twitter link previews work, route social crawlers to the backend OG endpoint:

```nginx
location ~* ^/u/(.+)$ {
    if ($http_user_agent ~* "Twitterbot|Slackbot|facebookexternalhit|LinkedInBot|TelegramBot") {
        proxy_pass http://backend:3000/api/trees/og/$1;
    }
    try_files $uri /index.html;
}
```

## 6. Notes

- `.env` and `.env.production` are gitignored — never commit them.
- `app-config.js` is generated at container startup with no aggressive cache, so frontend picks up new URLs after redeploy immediately.
- PostgreSQL is not exposed externally in production — it stays inside the Docker network.
