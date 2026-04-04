# Skill Tree

## Запуск

Для разработки:

```sh
npm run dev
```

Для продакшена:

```sh
npm run prod
```

Обе команды запускают проект через Docker Compose и берут все URL, домены и порты только из env-файлов.
`dev` использует общий `docker-compose.yml` и локальный override `docker-compose.dev.yml`.
`prod` использует только общий `docker-compose.yml`.

Остановка:

```sh
npm run dev:down
npm run prod:down
```

## Env-структура

Разработка: `.env`

Продакшен: `.env.production`

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

Примеры:

```env
# dev
FRONTEND_URL=http://localhost:4200
BACKEND_URL=http://localhost:3000
PORT=3000
API_URL=http://localhost:3000/api
```

```env
# prod
FRONTEND_URL=http://pdv.kpdtke.com.ua:20080
BACKEND_URL=http://pdv.kpdtke.com.ua:21000
PORT=3000
API_URL=http://pdv.kpdtke.com.ua:21000/api
```

## Что важно

- Frontend получает `API_URL`, `FRONTEND_URL` и `BACKEND_URL` через runtime `app-config.js`.
- Backend читает CORS, callback URL, frontend redirect URL и порт только из env.
- В `docker-compose.yml` больше нет отдельного docker-env файла: dev и prod используют только `.env` и `.env.production`.
- `docker-compose.dev.yml` нужен только для локальной разработки, чтобы открыть наружу порт PostgreSQL.
