#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

COMPOSE_ARGS=(--env-file .env -f docker-compose.yml -f docker-compose.dev.yml)

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
    # In this environment Docker can deny stop/kill from host namespace.
    # Stopping PID 1 from inside the container is more reliable.
    docker compose "${COMPOSE_ARGS[@]}" exec -T backend sh -lc 'kill -TERM 1 || true; sleep 1; kill -KILL 1 || true' >/dev/null 2>&1 || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! docker compose "${COMPOSE_ARGS[@]}" ps --status running backend | tail -n +2 | grep -q .; then
        break
      fi
      sleep 1
    done
  fi
}

graceful_stop_service frontend nginx -s quit
graceful_stop_backend
graceful_stop_service postgres sh -lc 'su postgres -c "pg_ctl -D \"${PGDATA:-/var/lib/postgresql/data}\" -m fast stop"'
docker compose "${COMPOSE_ARGS[@]}" stop frontend postgres >/dev/null 2>&1 || true
docker compose "${COMPOSE_ARGS[@]}" rm -fsv frontend postgres >/dev/null 2>&1 || true

if docker compose "${COMPOSE_ARGS[@]}" ps --status running backend | tail -n +2 | grep -q .; then
  echo "Backend is still running because Docker denied stop/kill on this host." >&2
  echo "Frontend/Postgres were cleaned up. Restart Docker daemon/host to fully remove backend." >&2
  echo "You can still run: npm run dev" >&2
  exit 0
fi

docker compose "${COMPOSE_ARGS[@]}" rm -fsv backend >/dev/null 2>&1 || true
