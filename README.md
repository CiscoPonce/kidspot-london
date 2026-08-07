# KidSpot London 🇬🇧

**KidSpot London** helps parents find and compare places to host a child's birthday party or a family reunion in London. The product is **party-first**: search surfaces curated party-hire venues (softplay, halls, museums with parties), not a raw OpenStreetMap dump. An autonomous enrichment engine improves contact details, opening hours, images, and **party-specific data** (pricing, capacity, booking links).

---

## Where the project stands (August 2026)

The platform is **launch-ready** — product complete through Phase 24; go-live infra and catalogue depth remain.

| Area | Status |
|:-----|:-------|
| **Product** | Party-first UI, shortlist, compare, share, PWA, booking flow (Phase 24). API defaults to **core catalogue**. |
| **Data structure** | `venue_scope`, `london_borough` (33 boroughs), party fields, FHRS denormalized ratings. |
| **Catalogue** | **2,311 core** venues · **182 party-capable** (post–Wave B, Aug 7). |
| **Contact coverage** | Core: ~78.6% websites · ~57.5% phones · ~16.9% images. |
| **Enrichment** | Worker with free-tier Google Places limits (12h, batch 25). |
| **API** | v1.3.0 — FHRS + `/metrics` mounted and live. |
| **Crons** | GitHub Actions: all green. |
| **Go-live gaps** | DNS + HTTPS for `kidspot.london`; offsite backups; git push. |

**Planning docs:** [`.planning/STATE.md`](.planning/STATE.md) · [`.planning/ROADMAP.md`](.planning/ROADMAP.md) · [`NEXT_ACTIONS.md`](NEXT_ACTIONS.md)

---

## 📊 Platform scale (production snapshot — 7 Aug 2026)

| Metric | Value |
|:-------|------:|
| **Total venues** | 16,751 |
| **Active venues** | 16,033 |
| **`venue_scope = core`** (party catalogue) | 2,311 |
| **`party_capable = true` (core)** | 182 |

> Live numbers: `GET /api/admin/enrichment-stats` (HMAC) or SQL in `backend/scripts/maintenance/`.

---

## 🎯 Product focus

1. **Search** — postcode or geolocation, radius, borough; **core venues by default**; optional parks via `include_parks=true`.
2. **Party-first venue cards** — hosts parties, price from, capacity, Enquire/Call when data exists (Phase 22 redesign: party info above info row on mobile).
3. **Party shortlist** — save venues locally (no account, persists across tabs).
4. **Compare** — side-by-side table (price, capacity, trust, contact).
5. **Share** — `/shortlist?v=…` link; recipient page re-fetches venues from the API (IDs validated server-side).
6. **PWA installable** — service worker, manifest, offline caching for search + detail pages.
7. **FHRS trust signals** — food hygiene rating cards on venue detail pages (batch + lazy matching).

---

## 🚀 Key features

- **Curated default search (Phase 19)** — API returns `venue_scope IN ('core')` unless `?include_parks=true` or type/facet explicitly requests parks (`park`, `outdoor_play`).
- **London borough normalisation** — canonical `london_borough` (33 boroughs + City of London); `borough` retained as neighbourhood/suburb.
- **Hyper-local search** — postcode or current location, 1–10 mile radius, category and facet filters.
- **Agentic discovery** — Brave Search fallback when the local DB + OSM return few results (fallback rows without scope are filtered out of core search).
- **Autonomous enrichment engine** — BullMQ worker 24/7: geocoding, OSM contacts/hours, direct website crawl, Foursquare, Geoapify, Apify/Brave images, contact backfill, **party data extraction**.
- **Party data extraction (Phase 18D)** — crawls `/parties`, `/birthday-parties`, etc.; regex + NVIDIA LLM fallback; stores `party_capable`, `party_price_from`, `party_max_capacity`, `party_enquiry_url`.
- **LLM fallback (Phase 18B)** — NVIDIA API when cheerio+regex cannot extract contact or party fields; non-streaming JSON parsing.
- **Verifiable trust signals** — FHRS hygiene rating (0–5 with date), owner-verified claim, accessibility from `features`.
- **Zero-budget contact pipeline** — Foursquare + direct crawl + Geoapify (Yelp removed from active enrichment).
- **Programmatic SEO** — borough and category landing pages.
- **Sponsor tiers** — Gold / Silver / Bronze featured listings.
- **Claim your listing** — owner verification flow.
- **PWA** — installable to home screen; offline fallback for search + detail pages; network-first caching for API; stale-while-revalidate for venue details.
- **Data Max sweeps** — Google Places discovery (needs key), postcodes.io geocoding, chain expansion, concurrent orchestrator via `data-max-runner.ts`.

---

## 🛠️ Technical stack

### Frontend
- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS 3.4
- **Maps**: MapLibre GL JS
- **State**: TanStack Query + local shortlist (`localStorage`)
- **Analytics**: Plausible

### Backend
- **Runtime**: Node.js 22, Express 5, TypeScript
- **Database**: PostgreSQL 15 + PostGIS
- **Cache / queue**: Redis 7, BullMQ
- **Logging**: Pino

### Data sources

| Source | Role | Cost |
|:-------|:-----|:-----|
| **OpenStreetMap / Overpass** | Discovery, coordinates, contacts, opening hours | Free |
| **Direct website crawl** | Contacts, Schema.org hours, **party pages** | Free |
| **Foursquare Places** | Phone, website, email | Free tier |
| **Geoapify** | POI matching, contacts | Free tier |
| **Brave Search / Images** | Fallback discovery and photos | Paid |
| **Apify (Google Places)** | Images, closure checks | Free tier |
| **Google Places API** | Venue discovery, Street View images | Paid (key needed) |
| **Postcodes.io** | Forward/reverse batch geocoding | Free |
| **NVIDIA API** | LLM extraction fallback (contacts + party) | Free tier |
| **FHRS** | Food hygiene ratings (trust signal) | Free |
| **Council / charity open data** | Community halls, halls for hire | Free |

---

## 🔄 Autonomous enrichment engine

A **self-scheduling BullMQ worker** (`backend/src/worker.ts`) registers repeatable jobs on startup.

### Pipeline overview

```
Layer 0:   Nominatim reverse-geocoding     → postcode, address, borough, london_borough
Layer 1:   OSM contact enrichment          → website, phone, email
Layer 1b:  OSM opening hours               → dedicated Overpass pass
Layer 2:   Brave web scraper               → websites for venues missing URLs
Layer 2b:  Direct website crawl            → cheerio + LLM fallback (contacts)
Layer 2c:  Party data extraction (18D)    → party_* fields (core venues first)
Layer 3:   Apify Google Places             → images, closure detection
Layer 3.6: Foursquare                     → contacts
Layer 3.7: Geoapify                       → POI / contacts
Layer 3.8: Contact backfill               → phone normalize, deep email crawl
Layer 3.9: **FHRS batch matching**        → daily 8am, 50 venues/batch, 90-day retry window
Layer 3.10: **Postcodes.io geocoding**     → forward (postcode→lat/lon) + reverse (lat/lon→postcode)
Layer 4:   Smart parks                    → OSM map links where needed
```

### Scheduled jobs

| Job | Schedule | Batch | Purpose |
|:----|:---------|------:|:--------|
| `enrich-geocode` | Every 4 hours | 200 | Postcodes, addresses, boroughs |
| `enrich-osm-contacts` | Every 6 hours | 200 | OSM contact tags |
| `enrich-osm-hours` | Every 6 hours | 100 | OSM opening hours |
| `enrich-direct-crawl` | Every 4 hours | 100 | Website contacts + hours (18B LLM fallback) |
| **`enrich-party-data`** | **Every 6 hours** | **50** | **Party capability, price, capacity, enquiry URL (18D)** |
| `enrich-web-scrape` | Every 8 hours | 30 | Brave website discovery |
| `enrich-apify` | Daily 03:00 UTC | 20 | Google Places images / closure |
| `enrich-brave-images` | Daily 04:00 UTC | 20 | Image fallback |
| `enrich-foursquare` | Daily 05:00 UTC | 50 | Contacts |
| `enrich-geoapify` | Daily 06:00 UTC | 40 | POI matching |
| `contact-backfill` | Daily 07:00 UTC | 50 | Normalize phones, email crawl |
| `enrich-fhrs-batch` | Daily 08:00 UTC | 50 | FHRS hygiene rating matching |
| `dedup-sweep` | Weekly (Sunday) | — | Merge duplicates |
| `run-discovery` | Weekly (Monday) | — | Full OSM discovery |

**Party job throughput:** ~50 venues × 4 runs/day ≈ **200 venues/day** on the core-first queue.

### Manual party backfill

```bash
cd backend
export DATABASE_URL=postgres://kidspot_admin:PASSWORD@127.0.0.1:5432/kidspot
export REDIS_URL=redis://127.0.0.1:6379
# Load NVIDIA_* from ../.env if using LLM fallback
npx tsx scripts/discovery/sources/party-data-enrichment.ts 80
```

### Borough CSV ingest (hall contacts — Tier 1)

Registry table `borough_csv_sources` + `npx tsx scripts/import-borough-csvs.ts` match open-data rows to existing venues and fill **phone, email, website, booking_url** when columns exist (COALESCE-safe).

**Audit feeds before bulk import:**

```bash
cd backend
npx tsx scripts/maintenance/audit-borough-csv-feeds.ts          # DB sources + London Datastore candidates
npx tsx scripts/maintenance/audit-borough-csv-feeds.ts --extra-only
```

Verified seed: migration `029_seed_cim_community_centres.sql` (Cultural Infrastructure Map — ~904 community centres, ~46% have `website` in CSV).

### Data curation (Phase 19, re-runnable SQL)

After migrations **027** and **028**, run maintenance scripts in order on a fresh or existing DB:

```bash
docker compose exec -T postgres psql -U kidspot_admin -d kidspot \
  -f /path/to/classify-venue-scope.sql
docker compose exec -T postgres psql -U kidspot_admin -d kidspot \
  -f /path/to/cleanup-moderate.sql
docker compose exec -T postgres psql -U kidspot_admin -d kidspot \
  -f /path/to/normalize-london-boroughs.sql
```

Scripts live in `backend/scripts/maintenance/` (`classify-venue-scope.sql`, `cleanup-moderate.sql`, `normalize-london-boroughs.sql`, `borough-coverage-report.sql`).

### GitHub Actions pipelines

| Workflow | Schedule | Description |
|:---------|:---------|:------------|
| `party-discovery.yml` | Every 6 hours | Council halls, charity halls, OSM party venues |
| `venue-expansion.yml` | Every 12 hours | School lettings, church/parish halls |
| `data-enrichment.yml` | Hourly | Triggers enrichment via admin API |
| `discovery.yml` | Scheduled | Stale venue refresh |

---

## 🚦 Getting started

### Prerequisites
- Docker and Docker Compose
- API keys (see [Environment variables](#-environment-variables))

### Setup

1. **Clone**
   ```bash
   git clone https://github.com/CiscoPonce/kidspot-london.git
   cd kidspot-london
   ```

2. **Environment**
   ```bash
   cp .env.example .env
   # Edit .env — at minimum DB_PASSWORD, BRAVE_API_KEY, INGEST_SIGNING_SECRET, CORS_ORIGIN
   ```

3. **Start stack**
   ```bash
   docker compose up -d --build
   ```

4. **Apply DB migrations** (numeric order on a fresh database)
   ```bash
   for f in backend/db/migrations/*.sql; do
     docker compose exec -T postgres psql -U kidspot_admin -d kidspot < "$f"
   done
   ```
   Key recent migrations: `026_add_party_data.sql`, `027_add_venue_scope.sql`, `028_add_london_borough.sql`, `038_add_fhrs_venue_rating_fields.sql`.

5. **Access**
   - **Frontend**: http://localhost:3005
   - **API (core search)**: http://localhost:4000/api/search/venues?borough=Hackney
   - **API (include parks)**: http://localhost:4000/api/search/venues?borough=Hackney&include_parks=true
   - **Health**: http://localhost:4000/health
   - **Party shortlist (shared)**: http://localhost:3005/shortlist?v=slug1,slug2

6. **Verify worker**
   ```bash
   docker compose logs worker --tail 30
   ```

7. **Tests**
   ```bash
   cd backend && npm test
   cd ../frontend && npm run build
   ```

---

## 📁 Project structure

```
kidspot-london/
├── .github/workflows/          # CI + scheduled discovery/enrichment
├── .planning/                  # ROADMAP, phase CONTEXT/PLAN (18B–22)
├── backend/
│   ├── src/
│   │   ├── server.ts                 # CORS, rate limiting, route mounting
│   │   ├── worker.ts                 # BullMQ: enrich-fhrs-batch job
│   │   ├── services/venueService.ts  # Search, scope filter, card hydration
│   │   ├── services/googlePlacesService.ts  # textSearch() + findPlace()
│   │   ├── services/fhrsService.ts   # FHRS API matching
│   │   ├── controllers/fhrsController.ts   # GET /api/fhrs/match/:id
│   │   ├── routes/fhrs.ts
│   │   └── utils/
│   │       ├── londonBoroughs.ts     # 33 boroughs + normalizeLondonBorough()
│   │       ├── nvidia.ts
│   │       └── partyExtraction.ts
│   ├── scripts/
│   │   ├── maintenance/             # Phase 19 SQL + audit-borough-csv-feeds.ts
│   │   ├── discovery/data-max-runner.ts      # Orchestrator: 4 sweeps concurrently
│   │   ├── discovery/osm-discovery.ts        # Free OSM venue discovery
│   │   ├── discovery/sources/
│   │   │   ├── direct-crawl-enrichment.ts
│   │   │   ├── party-data-enrichment.ts
│   │   │   ├── enrichment.ts         # Nominatim → borough + london_borough
│   │   │   ├── google-places-discovery.ts    # Borough-targeted discovery
│   │   │   ├── postcodesio-geocoding.ts      # Forward + reverse batch geocoding
│   │   │   └── fhrs-batch-match.ts           # Daily FHRS batch matching
│   └── db/migrations/
│       ├── 026_add_party_data.sql
│       ├── 027_add_venue_scope.sql
│       ├── 028_add_london_borough.sql
│       └── 038_add_fhrs_venue_rating_fields.sql
├── frontend/
│   ├── public/
│   │   ├── sw.js                  # Service worker (163 lines, 4 caches)
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── src/
│       ├── app/manifest.ts        # Dynamic Web App Manifest
│       ├── app/layout.tsx         # PWA wiring + SW registration
│       ├── app/saved/             # Party shortlist + compare
│       ├── app/shortlist/         # Shared shortlist (?v=)
│       └── components/
│           ├── venues/venue-card.tsx        # Mobile-first party card
│           ├── venues/venue-detail-content.tsx  # FHRS score card
│           └── layout/pwa-install-prompt.tsx    # Install banner
└── docker-compose.yml
```

---

## 🔍 API endpoints

### Public search

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/api/search/venues` | Search by lat/lon, radius, type, **borough** (`london_borough`). Default: **`venue_scope=core`**. Query: `include_parks=true` for parks. Response includes `meta.venue_scope_filter`. |
| GET | `/api/search/venues/slug/:slug/details` | Full venue details |
| GET | `/api/search/facets/venues` | Multi-facet search (same scope rules) |
| GET | `/api/search/slugs` | All slugs (SSG) |
| POST | `/api/search/venues/:id/click` | Outbound click tracking |

**Example**

```bash
# Party catalogue only (default)
curl "http://localhost:4000/api/search/venues?borough=Hackney&limit=20"

# Include parks / secondary outdoor venues
curl "http://localhost:4000/api/search/venues?borough=Hackney&include_parks=true&limit=20"
```

### FHRS (food hygiene)

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/api/fhrs/match/:id` | Lazy on-demand FHRS matching for a venue (returns rating/5 + date) |

### Admin (HMAC-authenticated)

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| POST | `/api/admin/ingest/parties` | Party venue discovery |
| POST | `/api/admin/ingest/expansion` | Venue expansion |
| POST | `/api/admin/ingest/enrichment` | Full enrichment pipeline |
| POST | `/api/admin/ingest/stale` | Stale venue refresh |
| GET | `/api/admin/enrichment-stats` | Data quality metrics |

---

## 🛡️ Security and data safety

- **CORS** — `CORS_ORIGIN` in production.
- **HMAC** — admin ingest endpoints (timestamp + SHA-256).
- **Rate limiting** — 60 req/min on API.
- **Helmet** — security headers.
- **Redis cache** — search and details TTL (cache keys include scope filter).
- **Dedup** — PostGIS 200 m + levenshtein.
- **UPSERT safety** — `COALESCE` / `NULLIF` so null enrichment never wipes good data.
- **Shortlist links** — only venue ids/slugs in URL; pages re-fetch from API.
- **BullMQ** — 3 retries, exponential backoff, stalled-job detection.
- **FHRS matching** — per-venue rate limiting (600ms crawl delay), 90-day retry window for unmatched venues.

---

## 🔭 Next priorities

1. **Obtain Google Places API key** — enables Street View images, venue discovery sweep, and chain expansion via Places Text Search.
2. **Council hall-hire contact ingest** — unlock listable community halls missing phone/website.
3. **Discovery guardrails** — stop refilling OSM noise into the active catalogue.
4. **Frontend `include_parks` toggle** — wire to API (no client-side hiding of bad data).
5. **Continue party verification crawl** on `venue_scope=core` until `party_capable` coverage is meaningful.
6. **SSL/HTTPS** — when domain is registered, configure reverse proxy with TLS.

---

## 🔧 Environment variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis URL |
| `BRAVE_API_KEY` | ✅ | Brave Search |
| `INGEST_SIGNING_SECRET` | ✅ | HMAC for admin ingest |
| `CORS_ORIGIN` | ✅ | Frontend origin(s) |
| `FOURSQUARE_API_KEY` | ✅ | Foursquare Places |
| `GEOAPIFY_API_KEY` | ✅ | Geoapify Places |
| `NEXT_PUBLIC_API_URL` | ✅ | Frontend → API base URL |
| `GOOGLE_PLACES_API_KEY` | Optional | Google Places Text Search + Street View |
| `APIFY_TOKEN` | Optional | Google Places via Apify |
| `APIFY_WEBHOOK_SECRET` | Optional | Apify webhook verification |
| `NVIDIA_API_KEY` | Optional | LLM fallback (18B contacts, 18D party) |
| `NVIDIA_MODEL` | Optional | Default: `stepfun-ai/step-3.7-flash` |
| `NVIDIA_BASE_URL` | Optional | Default: `https://integrate.api.nvidia.com/v1` |
| `YELP_API_KEY` | — | Legacy; not used by enrichment |

---

## 📄 License

MIT — see [LICENSE](LICENSE).
