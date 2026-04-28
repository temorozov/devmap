#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

COMPOSE_ARGS=(--env-file .env -f docker-compose.yml -f docker-compose.dev.yml)
DEV_SERVICES=(backend frontend postgres)

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

running_service_ids() {
  docker compose "${COMPOSE_ARGS[@]}" ps -q --status running "${DEV_SERVICES[@]}" 2>/dev/null || true
}

remove_stopped_services() {
  docker compose "${COMPOSE_ARGS[@]}" rm -fv "${DEV_SERVICES[@]}" >/dev/null 2>&1 || true
}

try_compose_down() {
  timeout 10s docker compose "${COMPOSE_ARGS[@]}" down --remove-orphans --timeout 2 >/dev/null 2>&1 || true
}

try_sudo_stop() {
  local container_ids

  container_ids="$(running_service_ids | tr '\n' ' ')"
  if [ -z "${container_ids// }" ]; then
    return 0
  fi

  if [ -t 0 ] && command -v sudo >/dev/null 2>&1; then
    echo "Docker denied normal stop. Trying sudo docker stop for stuck dev containers ..." >&2
    # shellcheck disable=SC2086
    sudo docker update --restart=no ${container_ids} >/dev/null 2>&1 || true
    # shellcheck disable=SC2086
    sudo docker stop ${container_ids} >/dev/null 2>&1 || true
    # shellcheck disable=SC2086
    sudo docker rm -f ${container_ids} >/dev/null 2>&1 || true
  fi
}

assert_stopped() {
  local still_running

  still_running="$(docker compose "${COMPOSE_ARGS[@]}" ps --status running "${DEV_SERVICES[@]}" 2>/dev/null | tail -n +2 || true)"
  if [ -n "${still_running}" ]; then
    echo "Some dev containers are still running because Docker denied stop/kill on this host:" >&2
    echo "${still_running}" >&2
    echo >&2
    echo "Run this once, then start again with npm run dev:" >&2
    echo "  sudo snap restart docker" >&2
    echo >&2
    echo "If you do not use snap Docker, run:" >&2
    echo "  sudo systemctl restart docker" >&2
    exit 1
  fi
}

graceful_stop_service frontend nginx -s quit
graceful_stop_backend
graceful_stop_service postgres sh -lc 'su postgres -c "pg_ctl -D \"${PGDATA:-/var/lib/postgresql/data}\" -m fast stop"'

timeout 10s docker compose "${COMPOSE_ARGS[@]}" stop --timeout 2 "${DEV_SERVICES[@]}" >/dev/null 2>&1 || true
remove_stopped_services
try_compose_down
try_sudo_stop
remove_stopped_services
assert_stopped
