#!/usr/bin/env bash
set -euo pipefail

BATCH_SIZE="${1:-10}"
ROOT_DIR="/home/ubuntu/kidspot"
LOG_FILE="${ROOT_DIR}/logs/grok-enrichment.log"

mkdir -p "${ROOT_DIR}/logs"

{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) Starting agy party enrichment batch (size=${BATCH_SIZE}) ==="
  cd "${ROOT_DIR}/backend"
  set -a
  if [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    . "${ROOT_DIR}/.env"
  fi
  set +a
  export DATABASE_URL="${DATABASE_URL:-postgres://kidspot:kidspot_dev_pass@127.0.0.1:5432/kidspot}"
  export PATH="/home/ubuntu/.local/bin:${PATH}"
  npx tsx scripts/discovery/sources/grok-party-enrichment.ts "${BATCH_SIZE}" --agy --web-search
} >> "${LOG_FILE}" 2>&1
