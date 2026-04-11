# Skill Tree

## Запуск

Для разработки:

```sh
npm run dev
```

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
- `OPENAI_API_KEY`
- `AI_OPENAI_MODEL`

## Что важно

- Frontend получает `API_URL`, `FRONTEND_URL` и `BACKEND_URL` через runtime `app-config.js`.
- Backend читает CORS, callback URL, frontend redirect URL и порт только из env.
- Генерация `skill tree` читает OpenAI-модель из `AI_OPENAI_MODEL` в `.env` или `.env.production` и требует `OPENAI_API_KEY`.
- В репозиторий больше не должны попадать реальные `.env` и `.env.production`; для этого оставлены только `.env.example` и `.env.production.example`.
- `app-config.js` теперь не кэшируется агрессивно, поэтому после деплоя frontend не будет держать старые URL из предыдущей конфигурации.
- Google / Discord OAuth больше не валят backend на старте, если их переменные не заполнены; соответствующие endpoints просто будут недоступны.
- `docker-compose.dev.yml` нужен только для локальной разработки, чтобы открыть наружу порт PostgreSQL.
