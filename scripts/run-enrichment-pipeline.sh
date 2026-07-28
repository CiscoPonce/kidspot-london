#!/bin/bash
# Run post-rebuild enrichment: party data, contacts, images, dedup, re-classify.
set -euo pipefail

ROOT="${ROOT:-/home/ubuntu/kidspot}"
cd "$ROOT"
set -a
source ./.env
set +a

export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"
export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379"
PSQL="docker compose exec -T -e PGPASSWORD=${DB_PASSWORD} postgres psql -h localhost -U kidspot_admin -d kidspot"
BACKEND="$ROOT/backend"

log() { echo "[$(date -Iseconds)] $*"; }
run_tsx() { cd "$BACKEND" && npx tsx "$@"; }

log "Step 1/8 — PostGIS cluster (migration 034)..."
$PSQL < "$BACKEND/db/migrations/034_cluster_venues_by_location.sql" || true

log "Step 2/8 — Direct website crawl (contacts)..."
run_tsx scripts/discovery/sources/direct-crawl-enrichment.ts 100 || log "Direct crawl partial errors"

log "Step 3/8 — Party data extraction (all core websites, batch 220)..."
run_tsx scripts/discovery/sources/party-data-enrichment.ts 220 || log "Party extraction partial errors"

log "Step 4/8 — Brave image enrichment..."
run_tsx scripts/discovery/sources/brave-image-enrichment.ts 30 || log "Brave images partial errors"

log "Step 5/8 — Street View image fallback..."
run_tsx -e "
import { enrichViaStreetView } from './scripts/discovery/sources/streetview-enrichment.ts';
const r = await enrichViaStreetView(50);
console.log(JSON.stringify(r));
" || log "Street View partial errors"

log "Step 6/8 — Dedup sweep..."
run_tsx scripts/discovery/dedup-sweep.ts || log "Dedup partial errors"

log "Step 7/8 — Re-classify and cleanup..."
$PSQL < "$BACKEND/scripts/maintenance/classify-venue-scope.sql"
$PSQL < "$BACKEND/scripts/maintenance/cleanup-moderate.sql"
$PSQL < "$BACKEND/scripts/maintenance/normalize-london-boroughs.sql"

log "Step 7b — Direct crawl retry (after schema fixes)..."
run_tsx scripts/discovery/sources/direct-crawl-enrichment.ts 100 || log "Direct crawl retry partial errors"

log "Step 8/8 — Borough CSV contact refresh..."
run_tsx scripts/import-borough-csvs.ts || log "Borough CSV partial errors"

log "Final metrics:"
$PSQL <<'SQL'
SELECT
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core') AS active_core,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND website IS NOT NULL AND website != '') AS core_website,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND phone IS NOT NULL AND phone != '') AS core_phone,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND email IS NOT NULL AND email != '') AS core_email,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND party_capable) AS party_capable,
  COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND images IS NOT NULL AND array_length(images,1)>0) AS core_images
FROM venues;
SQL

log "ENRICHMENT_DONE"
