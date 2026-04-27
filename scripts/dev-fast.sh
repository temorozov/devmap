#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

if [ ! -f .env ]; then
  echo "Missing .env. Create it from .env.example before running fast dev." >&2
  exit 1
fi

export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
COMPOSE_ARGS=(--env-file .env -f docker-compose.yml -f docker-compose.dev.yml)

set -a
# shellcheck disable=SC1091
. ./.env
set +a

export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
export PORT="${PORT:-3000}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:4200}"
export CORS_ORIGINS="${CORS_ORIGINS:-${FRONTEND_URL}}"

if [ -n "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="${DATABASE_URL//@postgres:5432/@localhost:${POSTGRES_PORT}}"
fi

PIDS=()

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
  if docker compose "${COMPOSE_ARGS[@]}" ps --status running backend | tail -n +2 | grep -q .; then
    disable_restart_policy backend
    docker compose "${COMPOSE_ARGS[@]}" exec -T backend sh -lc 'kill -TERM 1 || true; sleep 1; kill -KILL 1 || true' >/dev/null 2>&1 || true
    for _ in 1 2 3; do
      if ! docker compose "${COMPOSE_ARGS[@]}" ps --status running backend | tail -n +2 | grep -q .; then
        break
      fi
      sleep 1
    done
  fi
}

free_compose_app_services() {
  graceful_stop_service frontend nginx -s quit
  graceful_stop_backend
  docker compose "${COMPOSE_ARGS[@]}" stop frontend >/dev/null 2>&1 || true
  docker compose "${COMPOSE_ARGS[@]}" rm -fsv frontend >/dev/null 2>&1 || true
}

assert_port_free() {
  local port="$1"
  local label="$2"

  if ! port_is_free "$port"; then
    echo "${label} port ${port} is already in use. Stop the process using it, then run npm run dev:fast again." >&2
    exit 1
  fi
}

port_is_free() {
  local port="$1"
  node -e "const net = require('net'); const port = Number(process.argv[1]); const server = net.createServer().once('error', () => process.exit(1)).once('listening', () => server.close(() => process.exit(0))).listen(port, '0.0.0.0');" "$port"
}

find_free_backend_port() {
  local port

  for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010; do
    if port_is_free "$port"; then
      echo "$port"
      return 0
    fi
  done

  echo "No free backend port found in 3001-3010." >&2
  exit 1
}

cleanup() {
  for pid in "${PIDS[@]}"; do
    if kill -0 "${pid}" >/dev/null 2>&1; then
      kill "${pid}" >/dev/null 2>&1 || true
    fi
  done

  for pid in "${PIDS[@]}"; do
    wait "${pid}" >/dev/null 2>&1 || true
  done
}

trap cleanup EXIT INT TERM

echo "Stopping Docker frontend/backend if they are running ..."
free_compose_app_services

if ! port_is_free "${PORT}"; then
  original_port="${PORT}"
  PORT="${DEV_BACKEND_PORT:-$(find_free_backend_port)}"
  echo "Backend port ${original_port} is busy; using local backend port ${PORT}."
  assert_port_free "${PORT}" "Backend"
fi

export PORT
export BACKEND_URL="http://localhost:${PORT}"
export API_URL="${BACKEND_URL}/api"
export GOOGLE_CALLBACK_URL="${BACKEND_URL}/api/auth/google/callback"
export DISCORD_CALLBACK_URL="${BACKEND_URL}/api/auth/discord/callback"

if [ "${1:-}" != "backend" ]; then
  assert_port_free "4200" "Frontend"
fi

echo "Starting Postgres on localhost:${POSTGRES_PORT} ..."
docker compose "${COMPOSE_ARGS[@]}" up -d postgres

if [ "${1:-}" = "backend" ]; then
  echo "Starting backend on ${BACKEND_URL} ..."
  NX_NATIVE_COMMAND_RUNNER=false npx nx serve backend-backend
  exit $?
fi

echo "Starting backend on ${BACKEND_URL} ..."
NX_NATIVE_COMMAND_RUNNER=false npx nx serve backend-backend &
PIDS+=("$!")

echo "Starting frontend on http://localhost:4200 ..."
NX_NATIVE_COMMAND_RUNNER=false npx nx serve frontend-frontend &
PIDS+=("$!")

echo
echo "Fast dev is running:"
echo "  Frontend: http://localhost:4200"
echo "  Backend:  ${BACKEND_URL}/api"
echo
echo "Press Ctrl+C to stop local servers. Postgres remains available; run npm run dev:down to stop Docker services."

wait -n "${PIDS[@]}"
