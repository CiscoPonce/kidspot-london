# Phase 12 — Verification & Close-out (Wave 12-07)

**Created:** 2026-05-09  
**Wave:** 12-07 (Verification & Exposure)  
**Author:** automated close-out, executed against `agent-midas:/home/ubuntu/kidspot`  
**Scope:** prove the Phase 12 engine is wired end-to-end, baseline reliability metrics, and surface known operational gaps that block declaring the phase complete with a straight face.

---

## 1. What Wave 12-07 changed (no new product features)

| Area | Change | Why |
|------|--------|-----|
| `db/migrations/020_phase12_07_lock_facets_repair.sql` | Creates the missing `venue_source_claims` table; auto-locks every `source = 'manual'` row (`editor_locked = TRUE`); restores Atherton's `type = softplay` and `parent_facets = {soft_play, party_room, activity_session}`; recreates `search_venues_by_radius` to **return `parent_facets`** and to widen its filter so a venue tagged with the `soft_play` facet surfaces under the Soft Play chip even if `type` is `leisure_centre`. | The operator service was inserting into `venue_source_claims`, which never existed — every operator enrichment was silently failing. Manual seeds had `editor_locked = FALSE`, so nightly Yelp/OpenActive runs were free to overwrite them (the original Atherton bug class). The spatial search SQL never returned `parent_facets`, so the API payload showed `facets=[]` despite the column being populated. |
| `services/venueService.ts` | OpenActive/operator enrichment now strictly **adds** facets (never replaces); `venueService` is type-pinned to `typeof baseVenueService` and `getVenueById` is added to named exports. | Stops nightly imports stripping `soft_play`/`party_room`. Restores `claimController`'s `venueService.getVenueById` typecheck. |
| `controllers/claimController.ts` `controllers/ownerController.ts` `controllers/searchController.ts` `middleware/ownerAuth.ts` | Replaces `req.params.id as string` and `req.params.slug` with `String(req.params.X ?? '')`. | Express 5 / strict TS narrowed `req.params` indexer to `string \| string[]`; the casts no longer satisfied that type. Six TS errors clear. |
| `scripts/coverage-eval.ts` | New harness that runs the §11 postcode panel against the live API and writes a baseline JSON. **Read-only** — no DB writes. | Replaces the "≥ X%" placeholders in `12-CONTEXT.md` with reproducible numbers. |
| `.planning/phases/12-party-portal-reliability/fixtures/evaluation-postcodes-v1.csv` | 50 postcodes stratified into `inner_dense / outer_suburban / commuter_belt / thin_seed`. | Frozen panel; bump to `v2` only when stratification or columns change. |
| `.planning/phases/12-party-portal-reliability/baselines/<date>.json` | Output of the harness. | Track coverage drift across phases. |

---

## 2. How to reproduce

### 2.1 Apply migration on server

```bash
ssh ubuntu@agent-midas
cd /home/ubuntu/kidspot
PW=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2- | tr -d '"')
docker exec -i -e PGPASSWORD="$PW" kidspot-postgres-1 \
  psql -h localhost -U kidspot_admin -d kidspot \
  < backend/db/migrations/020_phase12_07_lock_facets_repair.sql
```

### 2.2 Rebuild API and flush search cache

```bash
cd /home/ubuntu/kidspot
docker compose build kidspot-api
docker compose up -d kidspot-api
docker exec kidspot-redis-1 redis-cli FLUSHDB
```

### 2.3 Run the coverage panel

```bash
docker exec kidspot-api-1 sh -lc \
  'tsx /app/scripts/coverage-eval.ts \
     --panel /app/.planning/phases/12-party-portal-reliability/fixtures/evaluation-postcodes-v1.csv \
     --api http://localhost:4000 \
     --radius 5 \
     --out /app/.planning/phases/12-party-portal-reliability/baselines/'$(date +%F)'.json'
```

(Run from the host outside the container if `.planning/` is not mounted into the API image; in that case point `--panel` to a file accessible to the script and copy the baseline back.)

---

## 3. Live verification (server, after migration + rebuild)

These commands produce the §4 metrics table.

```bash
# A. Atherton row health
PW=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2- | tr -d '"')
docker exec -e PGPASSWORD="$PW" kidspot-postgres-1 \
  psql -h localhost -U kidspot_admin -d kidspot \
  -c "SELECT id, type, source, editor_locked, parent_facets
      FROM venues WHERE slug='atherton-leisure-centre';"

# B. Lock-rate on manual seeds
docker exec -e PGPASSWORD="$PW" kidspot-postgres-1 \
  psql -h localhost -U kidspot_admin -d kidspot \
  -c "SELECT source, editor_locked, COUNT(*)
      FROM venues GROUP BY source, editor_locked
      ORDER BY source, editor_locked;"

# C. parent_facets exposed in API payload
curl -s 'http://localhost:4000/api/search/venues?lat=51.54297&lon=0.012152&radius=5&type=softplay&limit=10' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('|'.join(['name','dist','facets']));print('\\n'.join('|'.join([v['name'][:40],str(v.get('distance_miles')),str(v.get('parent_facets',[]))]) for v in d['data']['regular']['venues']))"

# D. Provenance / claims tables populated
docker exec -e PGPASSWORD="$PW" kidspot-postgres-1 \
  psql -h localhost -U kidspot_admin -d kidspot \
  -c "SELECT 'provenance', COUNT(*) FROM venue_provenance_log
      UNION ALL SELECT 'claims', COUNT(*) FROM venue_source_claims;"
```

---

## 4. Baseline metrics (filled by close-out run)

| Metric | Phase 12 plan target | Pre-12-07 | Post-12-07 |
|--------|----------------------|-----------|------------|
| Atherton (E15 4GH soft_play) returns Atherton | yes | **NO** (type=`leisure_centre`, facets=`{activity_session}`) | **YES** (type=`softplay`, facets=`{soft_play, party_room, activity_session}`, `editor_locked=true`) |
| `parent_facets` populated on `/api/search/venues` payload | yes | **NO** (`facets=[]` for all rows) | **YES** (`search_venues_by_radius` returns the column) |
| Manual seeds locked against batch overwrite | 100% | 0% (1 manual row, `editor_locked=false`) | 100% |
| `venue_source_claims` table exists | yes | **NO** (operator inserts silently failed) | yes |
| §11 panel coverage (50 postcodes, 5 mi, soft_play OR party_room) | ≥ 75% | **not measured** | **50/50 (100%)** — baseline in `baselines/2026-05-09.json` |
| TS errors in API typecheck | 0 | 6 | **0** (verified post-build) |

### 4.1 Coverage breakdown (2026-05-09 baseline)

| Stratum | Pass rate | Notes |
|---------|-----------|-------|
| `inner_dense` | 15 / 15 | `soft_play` chip returns 10–16 venues per postcode |
| `outer_suburban` | 15 / 15 | thin sectors (e.g. Sutton, Croydon) still return ≥ 1 soft_play within 5 mi |
| `commuter_belt` | 10 / 10 | borderline postcodes (Watford, Slough boundary) lean on OSM Overpass fallback |
| `thin_seed` | 10 / 10 | Atherton appears at 1.19 mi for E13 8SJ; Plumstead/Tottenham backed by DB seeds |

**Caveats baked into the metric:**
- `party_room` chip in this harness still uses the legacy `type=community_hall` route, which matches a broad set of community halls. Phase 13 should switch the harness to the facet API once `searchByFacets` is wired into the public route table.
- Two postcodes (KT12 2DH) show a top result from OSM Overpass (`OSM 161783603`) without a `name` tag — opportunity for a Wave 13 enrichment pass.

---

## 5. Honest gaps still open at close (do not pretend otherwise)

These are **not** code regressions — they are pre-existing operational gaps that Phase 12 was supposed to close but were carried in plan-only form. Logging them so the next phase can pick them up explicitly.

1. **`fhrs_establishments` is empty (0 rows).**  
   The FHRS service code path exists but no backfill has run. Until at least the §11 panel postcodes have FHRS lookups, the "convergence layer" does not contribute to ranking.
2. **`openactive_locations` and `openactive_sessions` are empty (Better/Everyone Active feeds registered, never fetched).**  
   The configured feed URLs are speculative — they may not be the actual OpenActive endpoints those operators publish. Real publisher URLs need to be confirmed before the worker pulls them.
3. **`borough_csv_records` is empty for the 3 seeded sources.**  
   The dataset URLs in `borough_csv_sources` are constructed against `data.london.gov.uk/download/...` paths that have not been verified to return CSVs at runtime; ingestion needs a smoke test per source before bulk-import.
4. **No `venue_source_claims` rows for non-operator sources.**  
   FHRS / borough CSV / OpenActive enrichment paths still write to `venue_provenance_log` but not to `venue_source_claims`. Phase 13 should standardise on writing both, so the "≥ 1 corroborating claim per venue" success criterion becomes computable.
5. **Coverage harness uses the production `/api/search/venues` endpoint with the legacy `type` parameter.**  
   The proper §11 measurement should hit a `facets[]` query once the search API exposes it as a first-class query param (`searchByFacets` route already exists internally). Current harness is a faithful approximation, not the canonical contract.
6. **Phase 12 success criterion "100% of venues have ≥ 1 `venue_source_claims` row" is not yet achievable.**  
   That criterion remains aspirational until items 1–4 above are executed end-to-end. Wave 12-07 makes it *possible* (table exists, code paths are guard-railed) but not *true*.

---

## 6. Definition of done for Phase 12 (revised, post-12-07)

Phase 12 can be marked **engine-complete** with this verification doc; **product-complete** still requires Phase 13 to:

- Backfill FHRS for the §11 panel and ≥ 50% of active venues.
- Run at least one OpenActive feed ingestion that produces non-zero `openactive_locations`.
- Run the borough CSV ingest for ≥ 3 sources end-to-end and reach > 100 `borough_csv_records`.
- Standardise enrichment paths to write `venue_source_claims` (FHRS, borough, OpenActive).
- Re-run `coverage-eval.ts` and improve the panel pass rate over the 12-07 baseline by ≥ 10 percentage points.

Until those land, "Phase 12 complete" should be read as **"Phase 12 plumbing complete and trustworthy; ingestion volume to follow."**
