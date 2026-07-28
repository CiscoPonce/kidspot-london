#!/bin/bash
# Rebuild KidSpot venue catalogue: ingest → classify → deactivate noise.
set -euo pipefail

ROOT="${ROOT:-/home/ubuntu/kidspot}"
cd "$ROOT"
set -a
source ./.env
set +a

export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"
PSQL="docker compose exec -T -e PGPASSWORD=${DB_PASSWORD} postgres psql -h localhost -U kidspot_admin -d kidspot"

log() { echo "[$(date -Iseconds)] $*"; }

log "Step 1/8 — Clearing existing venue data..."
$PSQL <<'SQL'
TRUNCATE venue_views, outbound_clicks, venue_claims, venue_provenance_log,
         venue_source_claims, operator_venues, borough_csv_records,
         deactivation_log, operator_crawl_log RESTART IDENTITY CASCADE;
TRUNCATE venues RESTART IDENTITY CASCADE;
SQL

log "Step 2/8 — London Datastore download..."
cd "$ROOT/backend"
npm run download

log "Step 3/8 — London Datastore import..."
npm run import

log "Step 4/8 — OSM discovery..."
npm run discover

log "Step 5/8 — Party venue discovery..."
npx tsx scripts/discovery/party-venues-discovery.ts

log "Step 6/8 — Venue expansion (schools + church halls)..."
npx tsx scripts/discovery/venue-expansion.ts

log "Step 7/8 — Classify scope and remove noise..."
cd "$ROOT"
$PSQL < backend/scripts/maintenance/classify-venue-scope.sql
$PSQL < backend/scripts/maintenance/cleanup-moderate.sql
$PSQL < backend/scripts/maintenance/normalize-london-boroughs.sql

log "Step 8/8 — Borough CSV contact matching..."
cd "$ROOT/backend"
npx tsx scripts/import-borough-csvs.ts || log "Borough CSV import had errors (non-fatal)"

log "Catalogue stats:"
$PSQL <<'SQL'
SELECT venue_scope, COUNT(*) FILTER (WHERE is_active) AS active, COUNT(*) AS total
FROM venues GROUP BY venue_scope ORDER BY active DESC;
SELECT COUNT(*) FILTER (WHERE is_active AND venue_scope = 'core') AS active_core FROM venues;
SQL

log "Done."
