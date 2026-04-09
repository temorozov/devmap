# Прод-запуск

## Что используется

- основной compose: `docker-compose.yml`
- prod env: `.env.production`

Итоговая команда запуска:

```bash
npm run prod
```

Или напрямую:

```bash
docker compose --env-file .env.production -f docker-compose.yml up -d --build
```

## Что проверить в `.env.production`

- `FRONTEND_URL=http://pdv.kpdtke.com.ua:20080`
- `BACKEND_URL=http://pdv.kpdtke.com.ua:21000`
- `API_URL=http://pdv.kpdtke.com.ua:21000/api`
- `FRONTEND_PORT=20080`
- `BACKEND_PORT=21000`
- `PORT=3000`
- `CORS_ORIGINS=http://pdv.kpdtke.com.ua:20080`
- `GOOGLE_CALLBACK_URL=http://pdv.kpdtke.com.ua:21000/api/auth/google/callback`
- `DISCORD_CALLBACK_URL=http://pdv.kpdtke.com.ua:21000/api/auth/discord/callback`
- `EMAIL_CONFIRM_URL=http://pdv.kpdtke.com.ua:20080/confirm-email`

Если меняются домен или порты, правится только `.env.production`.

## Полезные команды

```bash
npm run prod
npm run prod:recreate-db
npm run prod:down
docker compose --env-file .env.production -f docker-compose.yml logs -f
docker compose --env-file .env.production -f docker-compose.yml ps
```

## Если backend падает с `P1000`

Если в логах есть ошибка Prisma `P1000: Authentication failed`, а пароль в `.env.production`
уже указан правильно, обычно причина в старом Docker volume PostgreSQL, созданном с другим
паролем раньше.

В этом случае не нужно менять текущие пароли в `.env.production`. Нужно пересоздать только
контейнеры и volume базы:

```bash
npm run prod:recreate-db
```

Важно: команда удалит текущий Docker volume PostgreSQL и поднимет пустую базу заново.

## Примечание

Порт PostgreSQL наружу открыт только в `dev` через `docker-compose.dev.yml`. В `prod` база остаётся только внутри Docker-сети.
