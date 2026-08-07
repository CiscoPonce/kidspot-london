#!/bin/bash
# Quick latency check for KidSpot API + frontend. Run on VPS from project root.
set -euo pipefail

echo "=== KidSpot perf check $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

endpoints=(
  "http://localhost:4000/health"
  "http://localhost:4000/api/search/venues?borough=Hackney&limit=20"
  "http://localhost:4000/api/search/venues?lat=51.5074&lon=-0.1278&radius=5&limit=20"
  "http://localhost:3005/"
)

for url in "${endpoints[@]}"; do
  curl -s -o /dev/null -w "${url}\n  ttfb:%{time_starttransfer}s total:%{time_total}s code:%{http_code}\n" "$url"
done

total=0
for _ in $(seq 1 10); do
  t=$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:4000/api/search/venues?borough=Camden&limit=20")
  total=$(echo "$total + $t" | bc)
done
echo "10x borough search avg: $(echo "scale=4; $total/10" | bc)s"
