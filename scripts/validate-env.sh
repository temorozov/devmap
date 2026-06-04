#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

required_vars=(
  NODE_ENV
  FRONTEND_URL
  FRONTEND_PORT
  BACKEND_URL
  BACKEND_PORT
  PORT
  API_URL
  CORS_ORIGINS
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  DATABASE_URL
  JWT_SECRET
  GITHUB_CLIENT_ID
  GITHUB_CLIENT_SECRET
  GITHUB_CALLBACK_URL
)

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

missing_vars=()

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    missing_vars+=("$var_name")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "Missing required variables in $ENV_FILE:" >&2
  for var_name in "${missing_vars[@]}"; do
    echo "  - $var_name" >&2
  done
  exit 1
fi

if [[ "$DATABASE_URL" != postgresql://* ]]; then
  echo "DATABASE_URL must start with postgresql://" >&2
  exit 1
fi

if [[ "$NODE_ENV" != "production" && "$NODE_ENV" != "development" ]]; then
  echo "NODE_ENV must be either production or development" >&2
  exit 1
fi

echo "Environment file looks good: $ENV_FILE"
