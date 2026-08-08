#!/bin/bash
# Phase 21 — Party Catalogue Maximisation (production push)
# Runs discovery, enrichment, curation in sequence. Safe for free-tier Google Places.
set -euo pipefail

ROOT="${ROOT:-/home/ubuntu/kidspot}"
LOG="${LOG:-$ROOT/logs/phase-21-$(date +%Y%m%d_%H%M%S).log}"
cd "$ROOT"
mkdir -p logs

exec > >(tee -a "$LOG") 2>&1

set -a
source ./.env
set +a

export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"
export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379"
PSQL="docker compose exec -T -e PGPASSWORD=${DB_PASSWORD} postgres psql -h localhost -U kidspot_admin -d kidspot"
BACKEND="$ROOT/backend"

log() { echo "[$(date -Iseconds)] $*"; }
run_tsx() { cd "$BACKEND" && npx tsx "$@"; }
metrics() {
  $PSQL -c "
SELECT
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core') AS core,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND party_capable) AS party_capable,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND website IS NOT NULL AND website != '') AS core_website,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND phone IS NOT NULL AND phone != '') AS core_phone,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND images IS NOT NULL AND array_length(images,1)>0) AS core_images,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND postcode IS NOT NULL AND postcode != '') AS core_postcode
FROM venues;"
}

log "=== Phase 21 Production Push ==="
log "Log: $LOG"

log "Step 0 — Backup"
bash scripts/backup.sh || log "Backup warning (continuing)"

log "Baseline metrics:"
metrics

log "Step 1 — Google Places enrichment (up to 10 batches)"
for i in $(seq 1 10); do
  log "Google Places batch $i/10"
  run_tsx scripts/discovery/sources/google-places-enrichment.ts 50 || log "Google batch $i partial"
  sleep 3
done

log "Step 2 — Direct website crawl (5 batches)"
for i in $(seq 1 5); do
  log "Direct crawl batch $i/5"
  run_tsx scripts/discovery/sources/direct-crawl-enrichment.ts 100 || log "Crawl batch $i partial"
  sleep 2
done

log "Step 3 — Party data extraction (10 batches × 50 = up to 500 venues)"
for i in $(seq 1 10); do
  log "Party extraction batch $i/10"
  run_tsx scripts/discovery/sources/party-data-enrichment.ts 50 || log "Party batch $i partial"
  sleep 2
done

log "Step 4 — Foursquare + Geoapify backfill"
run_tsx scripts/discovery/sources/foursquare-enrichment.ts 100 || log "Foursquare partial"
run_tsx scripts/discovery/sources/geoapify-enrichment.ts 100 || log "Geoapify partial"

log "Step 5 — Postcodes.io geocoding"
run_tsx scripts/discovery/sources/postcodesio-geocoding.ts --batch-size 200 || log "Postcodes partial"

log "Step 6 — Chain expansion (Google Places)"
run_tsx scripts/discovery/chain-expansion.ts || log "Chain expansion partial"

log "Step 7 — Wave B discovery (5 runs)"
for i in $(seq 1 5); do
  log "Wave B run $i/5"
  bash "$ROOT/scripts/run-wave-b-discovery.sh" 15 || log "Wave B run $i partial"
  sleep 5
done

log "Step 8 — Image enrichment (Brave + Street View, 5 batches each)"
for i in $(seq 1 5); do
  log "Brave images batch $i/5"
  run_tsx scripts/discovery/sources/brave-image-enrichment.ts 50 || log "Brave batch $i partial"
  sleep 2
done
for i in $(seq 1 3); do
  log "Street View batch $i/3"
  run_tsx -e "
import { enrichViaStreetView } from './scripts/discovery/sources/streetview-enrichment.ts';
console.log(JSON.stringify(await enrichViaStreetView(50)));
" || log "StreetView batch $i partial"
  sleep 2
done

log "Step 9 — Borough CSV audit + import"
run_tsx scripts/maintenance/audit-borough-csv-feeds.ts || log "CSV audit partial"
run_tsx scripts/import-borough-csvs.ts || log "CSV import partial"

log "Step 10 — Re-classify, cleanup, dedup"
$PSQL < "$BACKEND/scripts/maintenance/classify-venue-scope.sql"
$PSQL < "$BACKEND/scripts/maintenance/cleanup-moderate.sql"
$PSQL < "$BACKEND/scripts/maintenance/normalize-london-boroughs.sql"
run_tsx scripts/discovery/dedup-sweep.ts || log "Dedup partial"
docker compose exec -T redis redis-cli -a "$REDIS_PASSWORD" FLUSHDB || log "Redis flush partial"

log "Step 11 — Final backup"
bash scripts/backup.sh || log "Final backup warning"

log "Final metrics:"
metrics

log "PHASE_21_DONE"
