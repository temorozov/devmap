#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env.production"
COMPOSE_ARGS=(--env-file "$ENV_FILE" -f docker-compose.yml)

if [ ! -f "$ENV_FILE" ]; then
  echo "$ENV_FILE not found"
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

docker compose "${COMPOSE_ARGS[@]}" up -d --build
docker compose "${COMPOSE_ARGS[@]}" ps

echo ""
echo "Frontend: ${FRONTEND_URL}"
echo "Backend:  ${BACKEND_URL}"
echo "API:      ${API_URL}"
echo ""
echo "Logs: docker compose ${COMPOSE_ARGS[*]} logs -f"
echo "Stop: docker compose ${COMPOSE_ARGS[*]} down"
