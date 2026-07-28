#!/bin/bash
# Resume catalogue rebuild from OSM discovery onward.
set -euo pipefail

ROOT="${ROOT:-/home/ubuntu/kidspot}"
cd "$ROOT"
set -a
source ./.env
set +a

export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"
export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379"
PSQL="docker compose exec -T -e PGPASSWORD=${DB_PASSWORD} postgres psql -h localhost -U kidspot_admin -d kidspot"

log() { echo "[$(date -Iseconds)] $*"; }

cd "$ROOT/backend"

log "OSM discovery..."
npm run discover

log "Party venue discovery..."
npx tsx scripts/discovery/party-venues-discovery.ts

log "Venue expansion..."
npx tsx scripts/discovery/venue-expansion.ts

cd "$ROOT"

log "Classify venue scope..."
$PSQL < backend/scripts/maintenance/classify-venue-scope.sql

log "Cleanup noise (deactivate excluded)..."
$PSQL < backend/scripts/maintenance/cleanup-moderate.sql

log "Normalize boroughs..."
$PSQL < backend/scripts/maintenance/normalize-london-boroughs.sql

cd "$ROOT/backend"
log "Borough CSV contact matching..."
npx tsx scripts/import-borough-csvs.ts || log "Borough CSV import had errors (non-fatal)"

log "Final stats:"
$PSQL <<'SQL'
SELECT venue_scope, COUNT(*) FILTER (WHERE is_active) AS active, COUNT(*) AS total
FROM venues GROUP BY venue_scope ORDER BY active DESC NULLS LAST;
SELECT COUNT(*) FILTER (WHERE is_active AND venue_scope = 'core') AS active_core FROM venues;
SQL

log "REBUILD_DONE"
