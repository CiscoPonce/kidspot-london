#!/bin/bash
# Phase 25 Wave B — Google Places discovery + optional re-classify
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export DATABASE_URL="${DATABASE_URL:-postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot}"
BATCH="${1:-15}"

echo "=== Wave B Discovery (batch=$BATCH) $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

BEFORE=$(docker exec kidspot-postgres-1 bash -c "PGPASSWORD=\$POSTGRES_PASSWORD psql -h localhost -U kidspot_admin -d kidspot -t -A -c \"SELECT COUNT(*) FROM venues WHERE is_active AND venue_scope='core';\"")
echo "Core venues before: $BEFORE"

cd backend
npx tsx scripts/discovery/sources/google-places-discovery.ts --batch-size "$BATCH"

echo ""
echo "=== Re-classify new venues ==="
docker exec -i kidspot-postgres-1 bash -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U kidspot_admin -d kidspot' \
  < "$ROOT/backend/scripts/maintenance/classify-venue-scope.sql" > /dev/null 2>&1 || echo "classify skipped"

AFTER=$(docker exec kidspot-postgres-1 bash -c "PGPASSWORD=\$POSTGRES_PASSWORD psql -h localhost -U kidspot_admin -d kidspot -t -A -c \"SELECT COUNT(*) FROM venues WHERE is_active AND venue_scope='core';\"")
echo "Core venues after: $AFTER"
echo "=== Wave B complete ==="
