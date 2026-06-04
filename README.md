# KidSpot London 🇬🇧

**KidSpot London** helps parents find and compare places to host a child's birthday party or a family reunion in London. The product is **party-first**: search surfaces curated party-hire venues (softplay, halls, museums with parties), not a raw OpenStreetMap dump. An autonomous enrichment engine improves contact details, opening hours, images, and **party-specific data** (pricing, capacity, booking links).

---

## Where the project stands (June 2026)

The platform is in a **much stronger position** than a few weeks ago:

| Area | Status |
|:-----|:-------|
| **Product** | Party-first UI (18C): cards, shortlist, compare, share. API defaults to the **core catalogue**. |
| **Data structure** | `venue_scope` (core / secondary / review / excluded) and **`london_borough`** (33 boroughs) are in place. |
| **Noise reduction** | ~2,500 junk venues deactivated; parks moved to `secondary`, not mixed into default search. |
| **Party facts** | 18D extraction live; core venues crawled first; counts growing via `enrich-party-data`. |
| **Gaps** | ~**670 listable** core venues (type-aware); **~41** with confirmed `party_capable`; **~1,300+ core halls** still lack phone/website — council hall-hire ingest is the next data win. |

**Honest summary:** The database and API now match the product story. Depth (contacts, confirmed party pricing) is still catching up; the architecture is right for that work.

Planning: `.planning/ROADMAP.md` — phases **18B–18D** (contacts + party extraction + frontend), **19** (data curation, in repo).

---

## 📊 Platform scale (production snapshot)

Figures from the curated Postgres database after Phase 19 cleanup (run live queries for exact counts).

| Metric | Approx. value |
|:-------|-------------:|
| **Active venues** | ~12,200 |
| **`venue_scope = core`** (party catalogue) | ~2,100 |
| **`venue_scope = secondary`** (parks / outdoor) | ~7,600 |
| **Deactivated (`excluded`)** | ~4,700 |
| **Listable core** (type-aware: contact or confirmed party) | ~670 |
| **`party_capable = true` (core)** | ~40+ (growing) |
| **`london_borough` populated** | 100% of active rows |

> `GET /api/admin/enrichment-stats` (HMAC) or SQL in `backend/scripts/maintenance/` for live numbers.

---

## 🎯 Product focus

1. **Search** — postcode or geolocation, radius, borough; **core venues by default**; optional parks via `include_parks=true`.
2. **Party-first venue cards** — hosts parties, price from, capacity, Enquire/Call when data exists.
3. **Party shortlist** — save venues locally (no account).
4. **Compare** — side-by-side table (price, capacity, trust, contact).
5. **Share** — `/shortlist?v=…` link; recipient page re-fetches venues from the API (IDs validated server-side).

---

## 🚀 Key features

- **Curated default search (Phase 19)** — API returns `venue_scope IN ('core')` unless `?include_parks=true` or type/facet explicitly requests parks (`park`, `outdoor_play`).
- **London borough normalisation** — canonical `london_borough` (33 boroughs + City of London); `borough` retained as neighbourhood/suburb.
- **Hyper-local search** — postcode or current location, 1–10 mile radius, category and facet filters.
- **Agentic discovery** — Brave Search fallback when the local DB + OSM return few results (fallback rows without scope are filtered out of core search).
- **Autonomous enrichment engine** — BullMQ worker 24/7: geocoding, OSM contacts/hours, direct website crawl, Foursquare, Geoapify, Apify/Brave images, contact backfill, **party data extraction**.
- **Party data extraction (Phase 18D)** — crawls `/parties`, `/birthday-parties`, etc.; regex + NVIDIA LLM fallback; stores `party_capable`, `party_price_from`, `party_max_capacity`, `party_enquiry_url`.
- **LLM fallback (Phase 18B)** — NVIDIA API when cheerio+regex cannot extract contact or party fields; non-streaming JSON parsing.
- **Verifiable trust signals** — FHRS hygiene rating, owner-verified claim, accessibility from `features`.
- **Zero-budget contact pipeline** — Foursquare + direct crawl + Geoapify (Yelp removed from active enrichment).
- **Programmatic SEO** — borough and category landing pages.
- **Sponsor tiers** — Gold / Silver / Bronze featured listings.
- **Claim your listing** — owner verification flow.

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
   Key recent migrations: `026_add_party_data.sql`, `027_add_venue_scope.sql`, `028_add_london_borough.sql`.

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
├── .planning/                  # ROADMAP, phase CONTEXT/PLAN (18B–18D, 19)
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── worker.ts
│   │   ├── services/venueService.ts   # Search, scope filter, card hydration
│   │   └── utils/
│   │       ├── londonBoroughs.ts    # 33 boroughs + normalizeLondonBorough()
│   │       ├── nvidia.ts
│   │       └── partyExtraction.ts
│   ├── scripts/
│   │   ├── maintenance/             # Phase 19 classify, cleanup, borough SQL
│   │   └── discovery/sources/
│   │       ├── direct-crawl-enrichment.ts
│   │       ├── party-data-enrichment.ts
│   │       └── enrichment.ts        # Nominatim → borough + london_borough
│   └── db/migrations/
│       ├── 026_add_party_data.sql
│       ├── 027_add_venue_scope.sql
│       └── 028_add_london_borough.sql
├── frontend/
│   └── src/
│       ├── app/saved/               # Party shortlist + compare
│       ├── app/shortlist/           # Shared shortlist (?v=)
│       └── components/venues/       # venue-card, compare-table
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

---

## 🔭 Next priorities

1. **Council hall-hire contact ingest** — unlock listable community halls missing phone/website.
2. **Discovery guardrails** — stop refilling OSM noise into the active catalogue.
3. **Frontend `include_parks` toggle** — wire to API (no client-side hiding of bad data).
4. **Continue party verification crawl** on `venue_scope=core` until `party_capable` coverage is meaningful.

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
| `APIFY_TOKEN` | Optional | Google Places via Apify |
| `APIFY_WEBHOOK_SECRET` | Optional | Apify webhook verification |
| `NVIDIA_API_KEY` | Optional | LLM fallback (18B contacts, 18D party) |
| `NVIDIA_MODEL` | Optional | Default: `stepfun-ai/step-3.7-flash` |
| `NVIDIA_BASE_URL` | Optional | Default: `https://integrate.api.nvidia.com/v1` |
| `YELP_API_KEY` | — | Legacy; not used by enrichment |

---

## 📄 License

MIT — see [LICENSE](LICENSE).
