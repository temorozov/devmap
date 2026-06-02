# Прод-запуск на VPS

## 1. Подготовка env

На сервере создай локальный env-файл на основе шаблона:

```bash
cp .env.production.example .env.production
```

Заполни в `.env.production` как минимум:

- `FRONTEND_URL`
- `FRONTEND_PORT`
- `BACKEND_URL`
- `BACKEND_PORT`
- `PORT`
- `API_URL`
- `CORS_ORIGINS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`

OAuth и email-интеграции теперь опциональны: если не заполнить Google / Discord переменные,
backend все равно поднимется, но эти способы входа будут недоступны.

## 2. Запуск

Рекомендуемый способ:

```bash
./deploy.sh
```

Что делает скрипт:

- валидирует `.env.production`
- проверяет итоговый `docker compose` конфиг
- собирает и поднимает контейнеры
- автоматически накатывает Prisma migrations через `prisma migrate deploy`

## 3. Полезные команды

```bash
./deploy.sh
npm run prod
npm run prod:down
docker compose --env-file .env.production -f docker-compose.yml logs -f
docker compose --env-file .env.production -f docker-compose.yml ps
```

## 4. Если backend не подключается к PostgreSQL

Если в логах есть Prisma `P1000: Authentication failed`, а пароль уже исправлен в `.env.production`,
скорее всего раньше был создан старый Docker volume с другим паролем.

В таком случае можно пересоздать базу:

```bash
npm run prod:recreate-db
```

Важно: команда удалит текущий volume PostgreSQL и поднимет пустую базу заново.

## 5. Важные замечания

- Реальные `.env` и `.env.production` больше не должны храниться в git.
- `app-config.js` отдается без агрессивного кэша, поэтому frontend подхватывает новые URL сразу после деплоя.
- В `prod` PostgreSQL наружу не публикуется и остается только внутри Docker-сети.
