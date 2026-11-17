#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

npx prisma generate

if [[ -n "${REDIS_URL:-}" ]]; then
  echo "[dev-server] Starting local hunt-start worker (REDIS_URL set)"
  npx tsx scripts/hunt-start-worker.ts &
  HUNT_START_PID=$!

  if [[ -n "${MQTT_URL:-}" ]]; then
    echo "[dev-server] Starting mqtt-live worker (MQTT_URL + REDIS_URL set)"
    npx tsx scripts/mqtt-live-worker.ts &
    MQTT_LIVE_PID=$!
  else
    echo "[dev-server] MQTT_URL missing — mqtt-live worker skipped"
    MQTT_LIVE_PID=""
  fi

  trap 'kill "$HUNT_START_PID" ${MQTT_LIVE_PID:-} 2>/dev/null || true' EXIT INT TERM
else
  echo "[dev-server] REDIS_URL missing — hunt auto-start + mqtt-live workers skipped"
fi

exec npx next dev --turbopack -H 0.0.0.0
