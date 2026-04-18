# Контекст проекта Skill Tree

Этот документ содержит прикладной контекст репозитория: как устроен проект, как его запускать и какие ограничения важны в разработке и деплое.

## Кратко о проекте

- Репозиторий: `skill-tree`.
- Тип: monorepo на `Nx`.
- Frontend: `Angular`.
- Backend: `NestJS`.
- База данных: `PostgreSQL` + `Prisma`.
- Инфраструктура запуска: `Docker Compose`.

## Основные команды

Локальная разработка:

```sh
npm run dev
# или
npm run dev:up
```

Остановка dev-окружения:

```sh
npm run dev:down
```

Продакшен-деплой:

```sh
cp .env.production.example .env.production
./deploy.sh
# или
npm run prod
```

Остановка прода:

```sh
npm run prod:down
```

## Как устроен запуск

- `dev` использует `docker-compose.yml` + `docker-compose.dev.yml`.
- `prod` использует только `docker-compose.yml`.
- Скрипты `scripts/dev-up.sh` и `scripts/dev-down.sh` предназначены для корректного запуска/остановки из любой директории.

## Env-конфигурация

Для разработки:

- локальный `.env` на основе `.env.example`.

Для продакшена:

- локальный `.env.production` на основе `.env.production.example`.

Ключевые переменные:

- `FRONTEND_URL`
- `FRONTEND_PORT`
- `BACKEND_URL`
- `BACKEND_PORT`
- `PORT`
- `API_URL`
- `CORS_ORIGINS`
- `GOOGLE_CALLBACK_URL`
- `DISCORD_CALLBACK_URL`
- `EMAIL_CONFIRM_URL`
- `DATABASE_URL`
- `POSTGRES_PORT`
- `OPENAI_API_KEY`
- `AI_OPENAI_MODEL`

## Важные поведенческие детали

- Frontend получает `API_URL`, `FRONTEND_URL` и `BACKEND_URL` через runtime-файл `app-config.js`.
- Backend читает CORS, callback URL, redirect URL и порт только из env.
- Генерация skill tree использует `AI_OPENAI_MODEL` и требует `OPENAI_API_KEY`.
- Google/Discord OAuth не должны падать на старте backend при пустых OAuth-переменных; соответствующие endpoints просто недоступны.
- `docker-compose.dev.yml` нужен только для локальной разработки (в т.ч. для публикации порта PostgreSQL).

## Деплой на VPS

Скрипт `./deploy.sh`:

- валидирует обязательные переменные в `.env.production`;
- проверяет итоговую `docker compose` конфигурацию перед стартом;
- поднимает контейнеры с `--remove-orphans`;
- применяет Prisma migrations через `prisma migrate deploy`.

Также можно передать кастомный env-файл:

```sh
./deploy.sh /path/to/your.env.production
```

## Ограничения по безопасности

- Реальные `.env` и `.env.production` не должны попадать в репозиторий.
- В репозитории должны храниться только шаблоны (`.env.example`, `.env.production.example`).
- Секреты (ключи, токены, пароли) нельзя выводить в логах и ответах.
