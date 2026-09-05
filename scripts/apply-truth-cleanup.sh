#!/usr/bin/env bash
# Run on the VPS from /home/ubuntu/kidspot after rsync.
set -euo pipefail
cd /home/ubuntu/kidspot

echo "=== apply migration 040 ==="
docker compose exec -T postgres \
  psql -U kidspot_admin -d kidspot \
  < backend/db/migrations/040_venue_liveness_and_truth.sql

echo "=== rebuild api + web ==="
docker compose build api web
docker compose up -d --force-recreate api web

echo "=== OSM liveness (party venues) ==="
docker compose exec -T api \
  npx tsx scripts/maintenance/verify-osm-liveness.ts --limit 800

echo "=== flush search cache ==="
docker compose exec -T redis redis-cli --no-auth-warning -a "${REDIS_PASSWORD:-}" KEYS 'search:*' \
  | head -c 1 >/dev/null || true
docker compose exec -T redis sh -c 'redis-cli --no-auth-warning -a "$REDIS_PASSWORD" --scan --pattern "search:*" | xargs -r redis-cli --no-auth-warning -a "$REDIS_PASSWORD" DEL' || true

echo "=== counts ==="
docker compose exec -T postgres \
  psql -U kidspot_admin -d kidspot -c \
  "SELECT is_active, liveness_status, count(*) FROM venues GROUP BY 1,2 ORDER BY 1 DESC, 2;"

echo DONE
