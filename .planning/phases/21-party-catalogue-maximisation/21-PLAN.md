---
phase: 21-party-catalogue-maximisation
plan: 01
type: execute
wave: 1
depends_on:
  - 19-data-curation
  - 18D-party-data-extraction
  - 20-improvement-plan
autonomous: partial
user_setup:
  - "GOOGLE_PLACES_API_KEY enabled (Places API New, Text Search)"
  - "Optional: top up Apify credits for chain expansion + closure checks"
  - "Optional: Brave Images quota for photo backfill"
---

# Phase 21: Party Catalogue Maximisation — Action Plan

Maximise **venue hire + softplay for kids’ birthdays** in Greater London through a sequenced discovery → curation → enrichment programme. Items marked **Now** use existing scripts; **Build** requires small new code.

---

## Execution order (do in this sequence)

| Step | Action | Type | Expected outcome |
|:----:|--------|------|------------------|
| **0** | Backup before each major batch | Ops | Verified dump ≥ 500 KB |
| **1** | Google Places enrichment (full pass) | **Now** | Core websites 19% → ~60%+; phones from ~0 → hundreds |
| **2** | Direct website crawl (contacts) | **Now** | Email, phone, hours from venue sites |
| **3** | Party data extraction (18D) | **Now** | `party_capable`, price, capacity, enquiry URLs |
| **4** | Borough CSV audit + import | **Now** | More hall contacts from council open data |
| **5** | Foursquare + Geoapify batches | **Now** | Additional phone/website backfill |
| **6** | Image enrichment (Brave + Street View) | **Now** | Photos on listing cards |
| **7** | Google Places **discovery** sweep | **Build** | Net-new softplay/hire venues OSM missed |
| **8** | Chain expansion via Google (not Apify) | **Build** | Flip Out, Oxygen, Gambado, etc. all locations |
| **9** | Geocoding via postcodes.io | **Build** | Postcode/borough on ≥80% core |
| **10** | Re-classify + dedup + normalize | **Now** | Clean core catalogue after bulk changes |
| **11** | Ongoing worker schedule | **Now** | ~200 party venues/day autonomous backfill |

---

## Step 0 — Safety (before every major run)

```bash
cd /home/ubuntu/kidspot
bash scripts/backup.sh
ls -lh /home/ubuntu/backups/kidspot_*.dump | tail -1
# Expect ≥ 500 KB (post-rebuild full catalogue)
```

**Never** run `docker system prune --volumes` on production.

---

## Step 1 — Google Places enrichment (highest leverage)

**Why:** ~1,900 active core venues lack phone or website. Party crawl cannot run without URLs.

**Existing code:** `backend/scripts/discovery/sources/google-places-enrichment.ts`  
**Worker job:** `enrich-google-places` (every 4h, batch 50) — too slow alone; run manual batches.

```bash
cd /home/ubuntu/kidspot
source .env
export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"

cd backend
# Repeat until "No venues require Google Places enrichment"
for i in $(seq 1 40); do
  echo "=== Google Places batch $i ==="
  npx tsx scripts/discovery/sources/google-places-enrichment.ts 50
  sleep 5
done
```

**Cost:** ~2,000 Text Search calls — typically within Google free tier (~5k/month).  
**Verify:**

```sql
SELECT COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND website IS NOT NULL AND website != '') AS core_web,
       COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND phone IS NOT NULL AND phone != '') AS core_phone
FROM venues;
```

---

## Step 2 — Direct website crawl (contacts + hours)

**Why:** Fills gaps Google missed; runs 18B LLM fallback for contact fields.

```bash
cd /home/ubuntu/kidspot/backend
source ../.env
export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"

# Repeat until queue empty (batch 100)
npx tsx scripts/discovery/sources/direct-crawl-enrichment.ts 100
```

Requires migration **037** (`contact_enriched_at`) — applied on VPS Jun 2026.

---

## Step 3 — Party data extraction (18D)

**Why:** Marks venues as birthday-party hosts; extracts price, capacity, enquiry link.

```bash
cd /home/ubuntu/kidspot/backend
export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"
export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379"

# All core venues with websites (~400+ after step 1)
npx tsx scripts/discovery/sources/party-data-enrichment.ts 500
```

**Slow:** ~2–4 min/venue (crawl delay + multiple `/parties` paths). Run overnight or use worker job (`enrich-party-data`, ~50 every 6h ≈ 200/day).

**Verify:**

```sql
SELECT COUNT(*) FILTER (WHERE is_active AND venue_scope='core' AND party_capable) AS party_core
FROM venues;
```

---

## Step 4 — Borough CSV audit + import

**Why:** Council community-centre CSVs are the best source of hall-hire contacts without scraping.

```bash
cd /home/ubuntu/kidspot/backend
export DATABASE_URL=...
export REDIS_URL=...

# 1. Find working feeds beyond migration 029 seed
npx tsx scripts/maintenance/audit-borough-csv-feeds.ts
npx tsx scripts/maintenance/audit-borough-csv-feeds.ts --extra-only

# 2. Import matched contacts (website, phone, email, booking_url)
npx tsx scripts/import-borough-csvs.ts
```

**Follow-up:** Add new working feed URLs to `borough_csv_sources` via migration or admin seed.

---

## Step 5 — Foursquare + Geoapify

```bash
cd /home/ubuntu/kidspot/backend
export DATABASE_URL=...

npx tsx scripts/discovery/sources/foursquare-enrichment.ts 100
npx tsx scripts/discovery/sources/geoapify-enrichment.ts 100
```

Worker runs these daily at 05:00 and 06:00 UTC if left unattended.

---

## Step 6 — Images (Brave + Street View)

```bash
cd /home/ubuntu/kidspot/backend
export DATABASE_URL=...

npx tsx scripts/discovery/sources/brave-image-enrichment.ts 50

# Street View (uses GOOGLE_PLACES_API_KEY)
npx tsx -e "
import { enrichViaStreetView } from './scripts/discovery/sources/streetview-enrichment.ts';
console.log(await enrichViaStreetView(100));
"
```

If zero images after run: confirm Brave image API quota and Google Static Street View API enabled on the same key.

---

## Step 7 — Google Places discovery sweep (**Build**)

**Gap:** Google is only used to enrich known venues. To approach “all possible” coverage, add a script that:

1. Iterates 33 London boroughs (or a grid of lat/lon cells)
2. Runs Places Text Search for queries such as:
   - `soft play`
   - `children's party venue`
   - `birthday party`
   - `hall hire`
   - `trampoline park`
3. Upserts new rows with `source = 'google_places'`, dedup by place ID / proximity
4. Runs **Step 10** curation SQL after import

**Suggested file:** `backend/scripts/discovery/google-places-discovery.ts`  
**Reuse:** `googlePlacesService.ts`, `dedup-sweep.ts`, borough bounds from `londonBoroughs.ts`

---

## Step 8 — Chain expansion without Apify (**Build**)

**Gap:** `chain-expansion.ts` lists 15 softplay brands but calls Apify (out of credits).

**Action:** Rewire to Google Places Text Search per chain name + “London”, same upsert pattern as Step 7.

**Chains already in repo:** Flip Out, Oxygen, Jump Giants, AirHop, Gravity, Kidspace, Gambado, Better Extreme, Clip n Climb, etc.

---

## Step 9 — postcodes.io geocoding (**Build**)

**Gap:** Nominatim returns 429; only ~43 core venues have postcodes.

**Action:** Replace or supplement `enrich-geocode` batch with UK postcodes.io reverse lookup from lat/lon (free, no key).

**Benefit:** Postcode on cards, better borough SEO pages, radius search UX.

---

## Step 10 — Re-classify + dedup (after bulk changes)

Always run after discovery or large enrichment:

```bash
cd /home/ubuntu/kidspot
source .env
PSQL="docker compose exec -T -e PGPASSWORD=${DB_PASSWORD} postgres psql -h localhost -U kidspot_admin -d kidspot"

$PSQL < backend/scripts/maintenance/classify-venue-scope.sql
$PSQL < backend/scripts/maintenance/cleanup-moderate.sql
$PSQL < backend/scripts/maintenance/normalize-london-boroughs.sql

cd backend
export DATABASE_URL=...
npx tsx scripts/discovery/dedup-sweep.ts

# Flush search cache
docker compose exec -T redis redis-cli -a "$REDIS_PASSWORD" FLUSHDB
```

**Classifier rules to maintain:**

- `better gym|better leisure|atherton leisure` → `core` (`better_gym_leisure`) — added Jun 2026
- Hall name patterns → `core`
- Adult gym / retail / worship-only → `excluded`

---

## Step 11 — Autonomous worker (set and forget)

Ensure worker is up with Google key:

```bash
cd /home/ubuntu/kidspot
docker compose up -d worker
docker compose logs worker --tail=20
```

Scheduled throughput (approx.):

| Job | Rate |
|-----|------|
| `enrich-party-data` | ~200 venues/day |
| `enrich-google-places` | ~300 venues/day |
| `enrich-direct-crawl` | ~600 venues/day |
| `enrich-geocode` | ~960 venues/day (if Nominatim allows) |

---

## One-shot pipeline (existing script)

For a combined enrichment pass after rebuild (does not include Steps 7–9 builds):

```bash
cd /home/ubuntu/kidspot
nohup bash scripts/run-enrichment-pipeline.sh > enrichment-pipeline.log 2>&1 &
tail -f enrichment-pipeline.log
# Wait for ENRICHMENT_DONE
```

Script path: `scripts/run-enrichment-pipeline.sh` (also in repo root `Kids_party/scripts/`).

---

## Regression tests

| Test | Command / check |
|------|-----------------|
| E15 4GH softplay anchor | `curl '.../api/search/venues?lat=51.543&lon=0.0121&radius=3&limit=5'` → Atherton Leisure Centre top result |
| Core-only filter | Response `meta.venue_scope_filter` = `["core"]` |
| Borough search | `?borough=Camden&limit=5` returns community halls |
| Party fields | Detail API returns `party_capable`, `party_price_from` when enriched |

Fixture postcode: **E15 4GH** (Atherton regression — see Phase 12 baselines).

---

## Task checklist (track in project)

### Wave A — Enrichment (existing tools, no new code)

- [ ] **21-A1** Full Google Places enrichment pass (~40×50 batches)
- [ ] **21-A2** Direct crawl until queue empty
- [ ] **21-A3** Party extraction batch (500+) or overnight worker
- [ ] **21-A4** Borough CSV audit + import new feeds
- [ ] **21-A5** Foursquare + Geoapify manual batches
- [ ] **21-A6** Brave + Street View image pass
- [ ] **21-A7** Re-classify, dedup, flush Redis cache
- [ ] **21-A8** Backup + record metrics in STATE.md

### Wave B — Discovery (new code)

- [ ] **21-B1** Implement `google-places-discovery.ts` (borough/grid sweep)
- [ ] **21-B2** Rewire `chain-expansion.ts` to Google Places (drop Apify dependency)
- [ ] **21-B3** postcodes.io geocoding in geocode job
- [ ] **21-B4** Re-run full curation after new venues imported

### Wave C — Quality gates

- [ ] **21-C1** Hit success criteria metrics (see 21-CONTEXT.md)
- [ ] **21-C2** Update README platform scale table
- [ ] **21-C3** Commit + push recovery fixes and Phase 21 docs

---

## Files reference

| Purpose | Path |
|---------|------|
| Google Places enrich | `backend/scripts/discovery/sources/google-places-enrichment.ts` |
| Party extract | `backend/scripts/discovery/sources/party-data-enrichment.ts` |
| Direct crawl | `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` |
| Borough CSV | `backend/scripts/import-borough-csvs.ts` |
| CSV audit | `backend/scripts/maintenance/audit-borough-csv-feeds.ts` |
| Classify scope | `backend/scripts/maintenance/classify-venue-scope.sql` |
| Cleanup noise | `backend/scripts/maintenance/cleanup-moderate.sql` |
| Dedup | `backend/scripts/discovery/dedup-sweep.ts` |
| Chain brands | `backend/scripts/discovery/chain-expansion.ts` |
| Combined pipeline | `scripts/run-enrichment-pipeline.sh` |
| Full rebuild | `scripts/rebuild-catalog.sh` |
| Worker jobs | `backend/src/worker.ts` |

---

## Out of scope for Phase 21

- HTTPS / domain (Phase 20 task 4.2)
- Firewall / fail2ban (infra hardening — separate track)
- Revenue / sponsorship features
- Apify-dependent paths unless credits restored
