#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Keep dev compose config stable even if .env misses this value.
export POSTGRES_PORT="${POSTGRES_PORT:-5433}"

COMPOSE_ARGS=(--env-file .env -f docker-compose.yml -f docker-compose.dev.yml)
LOG_PID=""

cleanup() {
  if [ -n "${LOG_PID}" ] && kill -0 "${LOG_PID}" >/dev/null 2>&1; then
    kill "${LOG_PID}" >/dev/null 2>&1 || true
    wait "${LOG_PID}" >/dev/null 2>&1 || true
  fi
}

on_interrupt() {
  echo
  echo "Stopping services via ./scripts/dev-down.sh ..." >&2
  cleanup
  ./scripts/dev-down.sh
  exit 0
}

trap on_interrupt INT TERM

disable_restart_policy() {
  local service="$1"
  local container_id

  container_id="$(docker compose "${COMPOSE_ARGS[@]}" ps -q "$service" 2>/dev/null || true)"
  if [ -n "${container_id}" ]; then
    docker update --restart=no "${container_id}" >/dev/null 2>&1 || true
  fi
}

graceful_stop_service() {
  local service="$1"
  shift

  if docker compose "${COMPOSE_ARGS[@]}" ps --status running "$service" | tail -n +2 | grep -q .; then
    disable_restart_policy "$service"
    docker compose "${COMPOSE_ARGS[@]}" exec -T "$service" "$@" >/dev/null 2>&1 || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! docker compose "${COMPOSE_ARGS[@]}" ps --status running "$service" | tail -n +2 | grep -q .; then
        break
      fi
      sleep 1
    done
  fi
}

graceful_stop_backend() {
  local stopped=0

  if docker compose "${COMPOSE_ARGS[@]}" ps --status running backend | tail -n +2 | grep -q .; then
    disable_restart_policy backend
    # In this environment Docker can deny stop/kill from host namespace.
    # Stopping PID 1 from inside the container is more reliable.
    docker compose "${COMPOSE_ARGS[@]}" exec -T backend sh -lc 'kill -TERM 1 || true; sleep 1; kill -KILL 1 || true' >/dev/null 2>&1 || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! docker compose "${COMPOSE_ARGS[@]}" ps --status running backend | tail -n +2 | grep -q .; then
        stopped=1
        break
      fi
      sleep 1
    done
  fi

  if [ "${stopped}" -eq 1 ]; then
    return 0
  fi

  if docker compose "${COMPOSE_ARGS[@]}" ps --status running backend | tail -n +2 | grep -q .; then
    return 1
  fi

  return 0
}

echo "Stopping existing dev containers ..."
./scripts/dev-down.sh

echo "Starting Postgres ..."
docker compose "${COMPOSE_ARGS[@]}" up -d postgres

echo "Building fresh backend/frontend images ..."
docker compose "${COMPOSE_ARGS[@]}" build --no-cache backend frontend

./scripts/dev-repair-prisma.sh

docker compose "${COMPOSE_ARGS[@]}" up --force-recreate --remove-orphans -d backend frontend

docker compose "${COMPOSE_ARGS[@]}" logs -f backend frontend postgres &
LOG_PID=$!
wait "${LOG_PID}"
