#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

COMPOSE_ARGS=(--env-file .env -f docker-compose.yml -f docker-compose.dev.yml)
MIGRATION_NAME="20260408103000_add_ai_batch_jobs"

if [ ! -f .env ]; then
  exit 0
fi

if ! docker compose "${COMPOSE_ARGS[@]}" ps --status running postgres | tail -n +2 | grep -q .; then
  exit 0
fi

psql_scalar() {
  docker compose "${COMPOSE_ARGS[@]}" exec -T postgres sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -tAc \"$1\"" 2>/dev/null | tr -d '[:space:]'
}

migration_failed="$(psql_scalar "select count(*) from \"_prisma_migrations\" where migration_name = '${MIGRATION_NAME}' and finished_at is null and rolled_back_at is null;" || true)"
table_exists="$(psql_scalar "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'AiBatchJob';" || true)"

if [ "${migration_failed}" != "1" ] || [ "${table_exists}" != "1" ]; then
  exit 0
fi

echo "Repairing local Prisma migration state for ${MIGRATION_NAME} ..."
docker compose "${COMPOSE_ARGS[@]}" run --rm --no-deps --entrypoint sh backend -lc \
  "npx prisma migrate resolve --applied ${MIGRATION_NAME}"
