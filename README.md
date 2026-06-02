# Skill Tree

## Запуск

Для разработки:

```sh
npm run dev
# или явно
npm run dev:up
```

Быстрый локальный запуск для просмотра изменений без пересборки Docker-образов:

```sh
npm run dev:fast
```

Он поднимает только PostgreSQL в Docker, а Angular и NestJS запускает через Nx на хосте.
Frontend: `http://localhost:4200`, backend API проксируется через `/api` на `http://localhost:3000`.
Если `3000` уже занят старым Docker backend, скрипт автоматически выберет свободный порт начиная с `3001`
и настроит frontend proxy на него.

Для продакшена:

```sh
cp .env.production.example .env.production
# заполнить .env.production своими значениями
./deploy.sh
```

Обе команды запускают проект через Docker Compose и берут все URL, домены и порты только из env-файлов.
`dev` использует общий `docker-compose.yml` и локальный override `docker-compose.dev.yml`.
`prod` использует только общий `docker-compose.yml`.

Остановка:

```sh
npm run dev:down
npm run prod:down
```

`dev:up` и `dev:down` используют скрипты из `scripts/`, которые корректно работают даже при запуске не из корня проекта.

## VPS деплой

```sh
cp .env.production.example .env.production
./deploy.sh
```

Что делает `./deploy.sh`:

- проверяет обязательные переменные в `.env.production`
- валидирует итоговый `docker compose` конфиг до запуска
- собирает и поднимает контейнеры с `--remove-orphans`
- автоматически применяет Prisma migrations через `prisma migrate deploy`

Если нужно использовать другой env-файл:

```sh
./deploy.sh /path/to/your.env.production
```

## Env-структура

Разработка: локальный `.env` на основе `.env.example`

Продакшен: локальный `.env.production` на основе `.env.production.example`

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
- `POSTGRES_PORT` (для dev-публикации PostgreSQL из `docker-compose.dev.yml`)
- `OPENAI_API_KEY`
- `AI_OPENAI_MODEL`

## Docs

- [Project Context](docs/PROJECT_CONTEXT.md)
- [Deployment](docs/DEPLOYMENT_INSTRUCTIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [AI Agents](docs/AGENTS.md)
- [AI Instructions](docs/AI_INSTRUCTIONS.md)
