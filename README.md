# KidSpot London 🇬🇧

**KidSpot London** is a hyper-local search engine designed to solve the data fragmentation problem for parents looking for child-friendly venues in London. By combining public datasets, autonomous background enrichment, and real-time web search fallbacks, KidSpot provides an instant, geo-aware directory of safe, age-appropriate locations for parties, play, and gatherings.

---

## 📊 Live Platform Stats

| Metric | Value |
|:---|---:|
| **Active Venues** | 16,667 |
| **Venue Types** | 8 (softplay, parks, leisure centres, community halls, museums, libraries, cafes, other) |
| **With Real Website** | 3,878 (23.3%) |
| **With Phone** | 2,349 (14.1%) |
| **With Email** | 1,039 (6.2%) |
| **With Postcode** | 15,170 (91.0%) |
| **With Opening Hours** | 629 (3.8%) |
| **With Images** | 272 (1.6%) |

> Data is continuously improving via the autonomous enrichment engine (see below).

---

## 🚀 Key Features

- **Hyper-Local Search**: Search by postcode or current location with a customizable radius (1–10 miles).
- **Agentic Discovery**: Real-time integration with Brave Search API to reduce zero-result searches.
- **Autonomous Enrichment Engine**: Self-scheduling BullMQ worker runs 24/7 — geocoding, OSM contacts, direct website crawling, Foursquare contact extraction, Geoapify POI matching, and Apify/Brave rich media.
- **Data Validation & Trust Layer**: Systematic closure detection (auto-deactivate closed venues), phone normalization, and "Last Verified" timestamps to ensure data reliability.
- **Rich Media Acquisition**: Multi-layered image engine using Google Places (via Apify) and Brave Image Search as a fallback for 100% photo coverage.
- **Zero-Budget Contact Pipeline**: Foursquare + direct website crawl + Geoapify replace paid Yelp Fusion for phone, email, and website data.

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS 4
- **Maps**: MapLibre GL JS
- **Trust UI**: Data freshness badges and community reporting tools.

### Backend
- **Runtime**: Node.js 22 (Express 5)
- **Database**: PostgreSQL 15 + PostGIS (spatial queries, levenshtein deduplication)
- **Caching**: Redis 7
- **Task Queue**: BullMQ (autonomous enrichment engine)
- **Verification**: Automatic status checks via Google/Brave.

### Data Sources

| Source | Role | Cost |
|:-------|:-----|:-----|
| **OpenStreetMap / Overpass** | Discovery, coords, contacts, opening hours | Free (w/ Retry fix) |
| **Brave Image Search** | Fallback visual media acquisition engine | Paid |
| **Foursquare Places API** | Contact extraction (phone, website, email) | Free tier |
| **Direct website crawl** | Contact + Schema.org hours from known URLs | Free |
| **Geoapify Places API** | POI matching and contact enrichment (OSM-based) | Free tier |
| **Apify (Google Places)** | Rich media (images) + Closure detection | Free tier |

> **Yelp Fusion API** — fully removed from the codebase (2026-05).

---

## 🔄 Autonomous Enrichment Engine

KidSpot runs a **self-scheduling BullMQ worker** that continuously enriches venue data without manual intervention.

### Enrichment Pipeline

```
Layer 0:  Nominatim Reverse-Geocoding  → postcode, address, borough
Layer 1:  OSM Contact Enrichment       → website, phone, email from Overpass tags
Layer 1b: OSM Opening Hours            → dedicated Overpass pass (resilient w/ retries)
Layer 2:  Brave Web Scraper            → find websites for venues missing them
Layer 2b: Direct Website Crawl         → cheerio crawl of known URLs (contact + hours)
Layer 3:  Apify Google Places          → images, closure detection (webhook powered)
Layer 3.6: Foursquare Places           → phone, website, email (contact engine)
Layer 3.7: Brave Images                → visual fallback engine for missing photos
Layer 3.8: Contact Backfill            → phone normalization + targeted email crawling
Layer 4:  Smart Parks                  → OSM map links for parks without websites
```

### Scheduled Jobs

| Job | Schedule | Batch | Purpose |
|:----|:---------|------:|:--------|
| `enrich-geocode` | Every 4 hours | 200 | Fill missing postcodes and addresses |
| `enrich-osm-contacts` | Every 6 hours | 200 | Extract contacts from OSM Overpass tags |
| `enrich-osm-hours` | Every 6 hours | 100 | Dedicated resilient Overpass hours pass |
| `enrich-direct-crawl` | Every 4 hours | 100 | Crawl known websites for contact info |
| `enrich-apify` | Daily 03:00 UTC | 20 | Google Places images + Closure checks |
| `enrich-brave-images` | Daily 04:00 UTC | 20 | Brave Image fallback pass |
| `enrich-foursquare` | Daily 05:00 UTC | 50 | Contact extraction via Foursquare |
| `enrich-geoapify` | Daily 06:00 UTC | 40 | POI matching via Geoapify |
| `contact-backfill` | Daily 07:00 UTC | 50 | Phone normalization + Deep email crawl |
| `dedup-sweep` | Weekly (Sunday) | — | Merge duplicate venues |
| `run-discovery` | Weekly (Monday) | — | Full OSM discovery run |

### GitHub Actions Pipelines

| Pipeline | Schedule | Description |
|:---------|:---------|:------------|
| `party-discovery.yml` | Every 6 hours | Council halls, charity halls, OSM party venues |
| `venue-expansion.yml` | Every 12 hours | School lettings and church/parish halls |
| `data-enrichment.yml` | Hourly | Triggers full enrichment pipeline |
| `discovery.yml` | Scheduled | Stale venue refresh |

---

## 🚦 Getting Started

### Prerequisites
- Docker and Docker Compose
- API keys (see Environment Variables below)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/CiscoPonce/kidspot-london.git
   cd kidspot-london
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Launch with Docker**:
   ```bash
   docker compose up -d --build
   ```

4. **Access the application**:
   - **Frontend**: `http://localhost:3005`
   - **API**: `http://localhost:4000/api/search/venues`
   - **Health Check**: `http://localhost:4000/health`

5. **Verify the enrichment engine**:
   ```bash
   docker compose logs worker --tail 20
   # Should show: "Repeatable enrichment jobs registered successfully"
   # Should show: "Worker is running with autonomous enrichment engine..."
   ```

6. **Run tests**:
   ```bash
   docker exec kidspot-worker-1 npx vitest run
   ```

---

## 📁 Project Structure

```
kidspot-london/
├── .github/workflows/              # CI/CD and automated data pipelines
├── .planning/                      # Development roadmap and phase docs
├── backend/
│   ├── src/
│   │   ├── server.ts               # Express app entrypoint
│   │   ├── worker.ts               # BullMQ autonomous enrichment engine
│   │   ├── routes/admin.ts         # Authenticated ingest API endpoints
│   │   └── services/
│   │       ├── venueService.ts     # Search, details, click tracking
│   │       ├── apifyService.ts     # Apify webhook processor
│   │       ├── foursquareService.ts # Foursquare Places API client
│   │       ├── geoapifyService.ts  # Geoapify Places API client
│   │       ├── fhrsService.ts      # Food hygiene ratings
│   │       └── claimService.ts     # Venue claiming flow
│   ├── scripts/discovery/
│   │   ├── run-discovery.ts        # OSM discovery orchestrator
│   │   ├── data-enrichment.ts      # Manual enrichment orchestrator
│   │   └── sources/
│   │       ├── enrichment.ts                 # Layer 0: Nominatim geocoding
│   │       ├── osm-contact-enrichment.ts     # Layer 1: OSM contacts
│   │       ├── osm-opening-hours-enrichment.ts # Layer 1b: OSM hours
│   │       ├── web-scraper-enrichment.ts     # Layer 2: Brave web scraper
│   │       ├── direct-crawl-enrichment.ts    # Layer 2b: Direct website crawl
│   │       ├── apify-enrichment.ts           # Layer 3: Apify Google Places
│   │       ├── foursquare-enrichment.ts    # Layer 3.6: Foursquare contacts
│   │       └── geoapify-enrichment.ts      # Layer 3.7: Geoapify POI matching
│   └── db/
│       ├── schema.sql
│       └── migrations/             # Incremental DB migrations (023–025)
├── frontend/                       # Next.js App Router
└── docker-compose.yml              # Full stack (postgres, redis, api, worker, web)
```

---

## 🔍 API Endpoints

### Public Search
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/api/search/venues` | Search by lat/lon, radius, type, borough |
| GET | `/api/search/venues/slug/:slug/details` | Full venue details |
| GET | `/api/search/facets/venues` | Multi-facet search |
| GET | `/api/search/slugs` | All venue slugs (for SSG) |
| POST | `/api/search/venues/:id/click` | Track outbound click |

### Admin (HMAC-authenticated)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| POST | `/api/admin/ingest/parties` | Trigger party venue discovery |
| POST | `/api/admin/ingest/expansion` | Trigger venue expansion |
| POST | `/api/admin/ingest/enrichment` | Trigger enrichment pipeline |
| POST | `/api/admin/ingest/stale` | Trigger stale venue refresh |
| GET | `/api/admin/enrichment-stats` | Data quality metrics |

---

## 🛡️ Security & Performance

- **CORS Locked**: Production origins enforced via `CORS_ORIGIN` env var.
- **HMAC Authentication**: All admin/ingest endpoints protected with timestamp + SHA-256 signature verification.
- **Rate Limited**: API protection via `express-rate-limit` (60 req/min).
- **Secure Headers**: Robust HTTP security via `helmet.js`.
- **Redis Caching**: 1-hour TTL for venue details and search results.
- **Deduplication**: PostGIS spatial dedup (200m) + levenshtein fuzzy matching.
- **Data Safety**: All enrichment uses `COALESCE(NULLIF())` guards to prevent empty values overwriting valid data.
- **Job Resilience**: BullMQ retry logic (3 attempts, exponential backoff) with stalled job detection.

---

## 🔧 Environment Variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `BRAVE_API_KEY` | ✅ | Brave Search API key |
| `INGEST_SIGNING_SECRET` | ✅ | HMAC key for admin endpoints |
| `CORS_ORIGIN` | ✅ | Allowed frontend origin(s) |
| `FOURSQUARE_API_KEY` | ✅ | Foursquare Places API service key |
| `GEOAPIFY_API_KEY` | ✅ | Geoapify Places API key |
| `APIFY_TOKEN` | Optional | Apify token for Google Places enrichment |
| `APIFY_WEBHOOK_SECRET` | Optional | Apify webhook verification secret |
| `API_BASE_URL` | Optional | Public API URL for webhooks |
| `NEXT_PUBLIC_API_URL` | Optional | Frontend API URL |
| `YELP_API_KEY` | — | Disabled (trial expired) |
| `NODE_ENV` | Optional | `production` or `development` |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
