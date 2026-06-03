# KidSpot London 🇬🇧

**KidSpot London** helps parents find and compare places to host a child's birthday party or a family reunion in London. It combines open-source and public datasets (OpenStreetMap, council data, FHRS, Foursquare, Geoapify, and more) with an autonomous enrichment engine that continuously improves contact details, opening hours, images — and **party-specific data** (pricing, capacity, booking links).

---

## 📊 Platform scale (approximate)

| Metric | Value |
|:---|---:|
| **Active venues** | ~14,700 |
| **Venue types** | softplay, parks, leisure centres, community halls, museums, libraries, cafes, other |
| **Party-eligible venues with a crawlable website** | ~3,600 |
| **Party data processed** | Growing daily via `enrich-party-data` |

> Run `GET /api/admin/enrichment-stats` (HMAC) or query Postgres for live numbers. Stats change as enrichment runs.

---

## 🎯 Product focus

1. **Search** — postcode or geolocation, radius, category filters.
2. **Party-first venue cards** — hosts parties, price from, capacity, Enquire/Call when data exists.
3. **Party shortlist** — save venues locally (no account).
4. **Compare** — side-by-side table (price, capacity, trust, contact).
5. **Share** — `/shortlist?v=…` link; recipient page re-fetches venues from the API (IDs validated server-side).

Planning docs: `.planning/ROADMAP.md`, phases **18C** (frontend) and **18D** (party data extraction).

---

## 🚀 Key features

- **Hyper-local search** — postcode or current location, 1–10 mile radius, category and facet filters.
- **Agentic discovery** — Brave Search fallback when the local DB + OSM return few results.
- **Autonomous enrichment engine** — BullMQ worker runs 24/7: geocoding, OSM contacts/hours, direct website crawl, Foursquare, Geoapify, Apify/Brave images, contact backfill, **party data extraction**.
- **Party data extraction (Phase 18D)** — crawls `/parties`, `/birthday-parties`, etc.; regex pre-pass + NVIDIA LLM fallback; stores `party_capable`, `party_price_from`, `party_max_capacity`, `party_enquiry_url`, and related fields.
- **LLM fallback (Phase 18B)** — NVIDIA API (`stepfun-ai/step-3.7-flash`) when cheerio+regex cannot extract contact or party fields; non-streaming JSON parsing.
- **Verifiable trust signals** — FHRS hygiene rating, owner-verified claim, accessibility from `features` (no fabricated “safe-checked” badges).
- **Zero-budget contact pipeline** — Foursquare + direct crawl + Geoapify replace paid Yelp for phone, email, and website.
- **Programmatic SEO** — borough and category landing pages.
- **Sponsor tiers** — Gold / Silver / Bronze featured listings.
- **Claim your listing** — owner verification flow.

> **Yelp Fusion** — removed from active enrichment (many softplay rows still have legacy Yelp URLs in `website`; those are skipped by the party crawler).

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
Layer 0:   Nominatim reverse-geocoding     → postcode, address, borough
Layer 1:   OSM contact enrichment          → website, phone, email
Layer 1b:  OSM opening hours               → dedicated Overpass pass
Layer 2:   Brave web scraper               → websites for venues missing URLs
Layer 2b:  Direct website crawl            → cheerio + LLM fallback (contacts)
Layer 2c:  Party data extraction (18D)    → party_capable, price, capacity, enquiry URL
Layer 3:   Apify Google Places             → images, closure detection
Layer 3.6: Foursquare                     → contacts
Layer 3.7: Geoapify                       → POI / contacts
Layer 3.8: Contact backfill               → phone normalize, deep email crawl
Layer 4:   Smart parks                    → OSM map links where needed
```

### Scheduled jobs

| Job | Schedule | Batch | Purpose |
|:----|:---------|------:|:--------|
| `enrich-geocode` | Every 4 hours | 200 | Postcodes and addresses |
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

**Throughput (party job):** ~50 venues × 4 runs/day ≈ **200 venues/day** for the ~3,600 eligible pool → first full pass in roughly **2–3 weeks**, then 30-day re-crawl.

### Manual party backfill (optional)

```bash
cd backend
export DATABASE_URL=postgres://kidspot_admin:PASSWORD@127.0.0.1:5432/kidspot
export REDIS_URL=redis://127.0.0.1:6379
# Load NVIDIA_* from ../.env if using LLM fallback
npx tsx scripts/discovery/sources/party-data-enrichment.ts 80
```

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

4. **Apply DB migrations** (if not already applied on your volume)
   ```bash
   docker compose exec -T postgres psql -U kidspot_admin -d kidspot -f - < backend/db/migrations/026_add_party_data.sql
   ```
   Apply other migrations in `backend/db/migrations/` in numeric order for a fresh database.

5. **Access**
   - **Frontend**: http://localhost:3005
   - **API**: http://localhost:4000/api/search/venues
   - **Health**: http://localhost:4000/health
   - **Party shortlist (shared)**: http://localhost:3005/shortlist?v=slug1,slug2

6. **Verify worker**
   ```bash
   docker compose logs worker --tail 30
   # Expect: "Repeatable enrichment jobs registered successfully"
   # Expect: enrich-party-data in the repeatable job list
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
├── .github/workflows/          # CI + scheduled discovery/enrichment triggers
├── .planning/                  # ROADMAP, phase CONTEXT/PLAN (18B–18D)
├── backend/
│   ├── src/
│   │   ├── server.ts           # Express API
│   │   ├── worker.ts           # BullMQ enrichment engine
│   │   ├── services/venueService.ts  # Search + card hydration (party_* fields)
│   │   └── utils/
│   │       ├── nvidia.ts       # LLM client (non-streaming JSON)
│   │       └── partyExtraction.ts
│   ├── scripts/discovery/sources/
│   │   ├── direct-crawl-enrichment.ts   # Layer 2b (exports fetch helpers)
│   │   └── party-data-enrichment.ts     # Layer 2c (18D)
│   └── db/migrations/          # … 025_enrichment_layers.sql, 026_add_party_data.sql
├── frontend/
│   └── src/
│       ├── app/saved/          # Party shortlist + compare + share
│       ├── app/shortlist/      # Shared shortlist (?v=)
│       ├── components/venues/venue-card.tsx, compare-table.tsx
│       ├── hooks/use-shortlist.ts
│       └── lib/trust.ts, opening-hours.ts, shortlist-link.ts
└── docker-compose.yml          # postgres, redis, api, worker, web
```

---

## 🔍 API endpoints

### Public search
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/api/search/venues` | Search by lat/lon, radius, type, borough (includes hydrated `party_*` on list cards) |
| GET | `/api/search/venues/slug/:slug/details` | Full venue details |
| GET | `/api/search/facets/venues` | Multi-facet search |
| GET | `/api/search/slugs` | All slugs (SSG) |
| POST | `/api/search/venues/:id/click` | Outbound click tracking |

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
- **Redis cache** — search and details TTL.
- **Dedup** — PostGIS 200 m + levenshtein.
- **UPSERT safety** — `COALESCE` / `NULLIF` so null or empty enrichment never wipes good data.
- **Shortlist links** — only venue ids/slugs in URL; pages re-fetch from API.
- **BullMQ** — 3 retries, exponential backoff, stalled-job detection.

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
