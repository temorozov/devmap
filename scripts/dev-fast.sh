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

cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "${pid}" 2>/dev/null || true
  done
  for pid in "${PIDS[@]}"; do
    wait "${pid}" 2>/dev/null || true
  done
}

trap cleanup EXIT INT TERM

# ── 1. Kill anything still holding the ports ──────────────────────────────────
echo "Stopping any running dev processes ..."
fuser -k 4200/tcp 2>/dev/null || true
fuser -k "${PORT}/tcp" 2>/dev/null || true

# Stop docker app services if running (frontend/backend containers from prod mode)
docker compose "${COMPOSE_ARGS[@]}" stop frontend backend 2>/dev/null || true
docker compose "${COMPOSE_ARGS[@]}" rm -f frontend backend 2>/dev/null || true
sleep 1

export PORT
export BACKEND_URL="http://localhost:${PORT}"
export API_URL="${BACKEND_URL}/api"
export GITHUB_CALLBACK_URL="${BACKEND_URL}/api/auth/github/callback"

# ── 2. Postgres ───────────────────────────────────────────────────────────────
echo "Starting Postgres on localhost:${POSTGRES_PORT} ..."
docker compose "${COMPOSE_ARGS[@]}" up -d postgres

echo "Waiting for Postgres ..."
for _ in $(seq 1 30); do
  if docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
      pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# ── 3. Migrations + Prisma client ─────────────────────────────────────────────
echo "Running migrations ..."
npx prisma migrate deploy

echo "Generating Prisma client ..."
npx prisma generate

# ── 4. Backend ────────────────────────────────────────────────────────────────
if [ "${1:-}" = "backend" ]; then
  echo "Starting backend on ${BACKEND_URL} ..."
  NX_NATIVE_COMMAND_RUNNER=false npx nx serve backend-backend --skip-nx-cache
  exit $?
fi

echo "Starting backend on ${BACKEND_URL} ..."
NX_NATIVE_COMMAND_RUNNER=false npx nx serve backend-backend --skip-nx-cache &
PIDS+=("$!")

echo "Waiting for backend to be ready ..."
for _ in $(seq 1 90); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# ── 5. Frontend ───────────────────────────────────────────────────────────────
echo "Starting frontend on http://localhost:4200 ..."
NX_NATIVE_COMMAND_RUNNER=false npx nx serve frontend-frontend &
PIDS+=("$!")

echo
echo "Dev is running:"
echo "  Frontend: http://localhost:4200"
echo "  Backend:  ${BACKEND_URL}/api"
echo
echo "Press Ctrl+C to stop. Postgres keeps running; use npm run dev:down to stop it."

wait -n "${PIDS[@]}"
