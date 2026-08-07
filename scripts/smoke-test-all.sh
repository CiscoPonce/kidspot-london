#!/bin/bash
# Comprehensive KidSpot smoke test — run on VPS from project root.
set -euo pipefail

BASE="${BASE_URL:-http://localhost:4000}"
WEB="${WEB_URL:-http://localhost:3005}"
PASS=0
FAIL=0
SKIP=0
RESULTS=()

record() {
  local status="$1" name="$2" code="$3" detail="${4:-}"
  RESULTS+=("$status|$name|$code|$detail")
  case "$status" in
    PASS) PASS=$((PASS+1)); echo "  ✅ PASS  $name ($code) $detail" ;;
    FAIL) FAIL=$((FAIL+1)); echo "  ❌ FAIL  $name ($code) $detail" ;;
    SKIP) SKIP=$((SKIP+1)); echo "  ⏭️  SKIP  $name — $detail" ;;
  esac
}

check() {
  local method="$1" url="$2" name="$3" expect="$4"
  local extra_headers=("${@:5}")
  local code body
  if [ ${#extra_headers[@]} -gt 0 ]; then
    code=$(curl -sS -o /tmp/smoke_body.json -w "%{http_code}" -X "$method" "$url" "${extra_headers[@]}" 2>/dev/null || echo "000")
  else
    code=$(curl -sS -o /tmp/smoke_body.json -w "%{http_code}" -X "$method" "$url" 2>/dev/null || echo "000")
  fi
  body=$(head -c 120 /tmp/smoke_body.json 2>/dev/null | tr '\n' ' ')
  if [ "$code" = "$expect" ]; then
    record PASS "$name" "$code" "$body"
  else
    record FAIL "$name" "$code" "expected $expect — $body"
  fi
}

hmac_post() {
  local path="$1" name="$2" body="$3" expect="$4"
  local secret="${INGEST_SIGNING_SECRET:?INGEST_SIGNING_SECRET required}"
  local ts sig code
  ts=$(date -u +%s)
  sig=$(printf '%s' "${ts}.${body}" | openssl dgst -sha256 -hmac "$secret" -r | awk '{print $1}')
  code=$(curl -sS -o /tmp/smoke_body.json -w "%{http_code}" \
    -X POST "${BASE}${path}" \
    -H "Content-Type: application/json" \
    -H "x-ingest-timestamp: ${ts}" \
    -H "x-ingest-signature: sha256=${sig}" \
    --data "$body" 2>/dev/null || echo "000")
  local body_preview
  body_preview=$(head -c 100 /tmp/smoke_body.json 2>/dev/null | tr '\n' ' ')
  if [ "$code" = "$expect" ]; then
    record PASS "$name" "$code" "$body_preview"
  else
    record FAIL "$name" "$code" "expected $expect — $body_preview"
  fi
}

echo "=============================================="
echo " KidSpot Full Smoke Test"
echo " $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " API: $BASE  WEB: $WEB"
echo "=============================================="

# ── Resolve sample venue ──
SAMPLE=$(curl -sS "${BASE}/api/search/venues?borough=Hackney&limit=1")
VENUE_ID=$(echo "$SAMPLE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['regular']['venues'][0]['id'])" 2>/dev/null || echo "")
VENUE_SLUG=$(echo "$SAMPLE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['regular']['venues'][0]['slug'])" 2>/dev/null || echo "")
echo "Sample venue: id=$VENUE_ID slug=$VENUE_SLUG"
echo ""

echo "── Health & readiness ──"
check GET "${BASE}/health" "GET /health" 200
check GET "${BASE}/ready" "GET /ready" 200
check GET "${BASE}/api/nonexistent" "GET /api/nonexistent (404)" 404

echo ""
echo "── Search (public) ──"
check GET "${BASE}/api/search/venues?borough=Hackney&limit=5" "GET /api/search/venues (borough)" 200
check GET "${BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius=5&limit=5" "GET /api/search/venues (geo)" 200
check GET "${BASE}/api/search/venues?borough=Hackney&include_parks=true&limit=5" "GET /api/search/venues (parks)" 200
check GET "${BASE}/api/search/venues" "GET /api/search/venues (missing params → 400)" 400
check GET "${BASE}/api/search/facets" "GET /api/search/facets" 200
check GET "${BASE}/api/search/facets/venues?borough=Hackney&limit=3" "GET /api/search/facets/venues" 200
check GET "${BASE}/api/search/slugs" "GET /api/search/slugs" 200

if [ -n "$VENUE_SLUG" ]; then
  check GET "${BASE}/api/search/venues/slug/${VENUE_SLUG}/details" "GET /api/search/venues/slug/:slug/details" 200
fi
if [ -n "$VENUE_ID" ]; then
  check GET "${BASE}/api/search/venues/${VENUE_ID}/details" "GET /api/search/venues/:id/details" 200
  check POST "${BASE}/api/search/venues/${VENUE_ID}/click" "POST /api/search/venues/:id/click" 200
fi

echo ""
echo "── FHRS & metrics (may be unmounted) ──"
if [ -n "$VENUE_ID" ]; then
  check GET "${BASE}/api/fhrs/match/${VENUE_ID}" "GET /api/fhrs/match/:id" 200
fi
check GET "${BASE}/metrics" "GET /metrics (Prometheus)" 200

echo ""
echo "── Sponsors (public) ──"
check GET "${BASE}/api/sponsors/stats" "GET /api/sponsors/stats" 200
check GET "${BASE}/api/sponsors/pricing" "GET /api/sponsors/pricing" 200
check GET "${BASE}/api/sponsors/venues?limit=3" "GET /api/sponsors/venues" 200
if [ -n "$VENUE_ID" ]; then
  check GET "${BASE}/api/sponsors/venues/${VENUE_ID}" "GET /api/sponsors/venues/:id" 200
fi

echo ""
echo "── Claim & owner (auth expected) ──"
if [ -n "$VENUE_ID" ]; then
  check POST "${BASE}/api/venues/${VENUE_ID}/claim" "POST /api/venues/:id/claim" 400
fi
check GET "${BASE}/api/venues/claim/verify" "GET /api/venues/claim/verify (no token)" 400
check POST "${BASE}/api/owner/login" "POST /api/owner/login (no body)" 400
check GET "${BASE}/api/owner/venues/1/stats" "GET /api/owner/venues/:id/stats (no auth)" 401

echo ""
echo "── Billing ──"
check POST "${BASE}/api/billing/create-checkout-session" "POST /api/billing/create-checkout-session (no body)" 400

echo ""
echo "── Admin HMAC (dry_run — no DB writes) ──"
if [ -n "${INGEST_SIGNING_SECRET:-}" ]; then
  hmac_post "/api/admin/ingest/stale" "POST /api/admin/ingest/stale (dry_run)" '{"limit":1,"dry_run":true}' 200
  hmac_post "/api/admin/ingest/parties" "POST /api/admin/ingest/parties (dry_run)" '{"dry_run":true}' 200
  hmac_post "/api/admin/ingest/expansion" "POST /api/admin/ingest/expansion (dry_run)" '{"dry_run":true}' 200
  hmac_post "/api/admin/ingest/enrichment" "POST /api/admin/ingest/enrichment (dry_run)" '{"dry_run":true}' 200
  hmac_post "/api/admin/enrichment-stats" "GET-style via wrong method" '{"dry_run":true}' 404
  check GET "${BASE}/api/admin/enrichment-stats" "GET /api/admin/enrichment-stats (no HMAC → 401)" 401
  TS=$(date -u +%s)
  hmac_post "/api/admin/enrichment-stats" "POST /api/admin/enrichment-stats (wrong — GET needed)" '{"dry_run":true}' 404
  # Proper GET with HMAC isn't standard — endpoint is GET with verifyHmac
  SIG=$(printf '%s' "${TS}." | openssl dgst -sha256 -hmac "$INGEST_SIGNING_SECRET" -r | awk '{print $1}')
  code=$(curl -sS -o /tmp/smoke_body.json -w "%{http_code}" \
    -X GET "${BASE}/api/admin/enrichment-stats" \
    -H "x-ingest-timestamp: ${TS}" \
    -H "x-ingest-signature: sha256=${SIG}" 2>/dev/null || echo "000")
  preview=$(head -c 80 /tmp/smoke_body.json 2>/dev/null | tr '\n' ' ')
  if [ "$code" = "200" ]; then record PASS "GET /api/admin/enrichment-stats (HMAC)" "$code" "$preview"
  else record FAIL "GET /api/admin/enrichment-stats (HMAC)" "$code" "expected 200 — $preview"; fi
  check POST "${BASE}/api/admin/ingest/stale" "POST /api/admin/ingest/stale (no HMAC → 401)" 401
else
  record SKIP "Admin HMAC tests" "-" "INGEST_SIGNING_SECRET not set"
fi

echo ""
echo "── Frontend pages ──"
for path in "/" "/saved" "/shortlist" "/how-it-works" "/owner/login" "/venues-in/hackney" "/venues-by/softplay"; do
  check GET "${WEB}${path}" "GET ${path}" 200
done
if [ -n "$VENUE_SLUG" ]; then
  check GET "${WEB}/venue/${VENUE_SLUG}" "GET /venue/:slug" 200
fi

echo ""
echo "=============================================="
echo " RESULTS: ✅ $PASS passed  ❌ $FAIL failed  ⏭️  $SKIP skipped"
echo "=============================================="

[ "$FAIL" -eq 0 ]
