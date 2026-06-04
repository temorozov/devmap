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
BACKEND_URL=https://yourdomain.com
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
EMAIL_FROM=DevMap <noreply@yourdomain.com>
EMAIL_CONFIRM_URL=https://yourdomain.com/confirm-email

# AI inference (optional — JD matcher skill extraction; falls back to literal matching when unset)
OPENAI_API_KEY=
AI_OPENAI_MODEL=gpt-4o-mini
AI_REQUEST_TIMEOUT_MS=30000

OAUTH_FRONTEND_REDIRECT_URL=
```

Optional integrations degrade gracefully — missing `RESEND_API_KEY` skips emails, missing `OPENAI_API_KEY` falls back to literal skill matching in the JD matcher.

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

## 5. HTTPS / SSL termination

The Docker Compose stack serves HTTP on port `FRONTEND_PORT` (default 80). nginx inside the frontend container handles both the Angular app **and** proxies `/api/*` to the backend — no external reverse proxy is required for HTTP.

For HTTPS, add a reverse proxy in front (nginx, Caddy, or cloud LB) that terminates TLS and forwards to port 80:

```nginx
# Example: external nginx terminating SSL
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

The OG social preview route is already handled inside the container's nginx config.

## 6. Notes

- `.env` and `.env.production` are gitignored — never commit them.
- `app-config.js` is generated at container startup with no aggressive cache, so frontend picks up new URLs after redeploy immediately.
- PostgreSQL is not exposed externally in production — it stays inside the Docker network.
- The backend container port (`BACKEND_PORT`) is still exposed for direct access if needed (e.g. debugging), but all production traffic should go through port 80.
