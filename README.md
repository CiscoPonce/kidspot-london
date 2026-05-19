# KidSpot London 🇬🇧

**KidSpot London** is a hyper-local search engine designed to solve the data fragmentation problem for parents looking for child-friendly venues in London. By combining public datasets, intelligent agentic discovery, and real-time web search fallbacks, KidSpot provides an instant, geo-aware directory of safe, age-appropriate locations for parties, play, and gatherings.

---

## 📊 Live Platform Stats

| Metric | Value |
|:---|---:|
| **Active Venues** | 14,238 |
| **Venue Types** | 8 (softplay, parks, leisure centres, community halls, museums, libraries, cafes, other) |
| **With Website** | 1,390 (9.8%) |
| **With Phone** | 595 (4.2%) |
| **With Email** | 267 (1.9%) |
| **Geo-Enriched** | 5,095 (35.8%) |
| **Contact-Enriched** | 4,764 (33.5%) |

> Data is continuously improving via the autonomous enrichment engine (see below).

---

## 🚀 Key Features

- **Hyper-Local Search**: Search by postcode or current location with a customizable radius (1-10 miles).
- **Agentic Discovery**: Real-time integration with Brave Search API to ensure "zero-result" searches never happen. If it's on the web, KidSpot will find it.
- **Autonomous Enrichment Engine**: 6 scheduled BullMQ jobs continuously enrich venue data 24/7 — reverse-geocoding, OSM contact extraction, web scraping, and Google Places via Apify.
- **Programmatic SEO**: 33+ dedicated area pages (e.g., "Venues in Islington") and category-specific landing pages (e.g., "Soft Play in London").
- **Sponsor System**: Multi-tiered monetization engine (Gold, Silver, Bronze) for featured local business listings.
- **Claim Your Listing**: Self-service verification flow for venue owners with dedicated sponsor dashboards.
- **Automated Data Pipelines**: GitHub Actions + BullMQ scheduled jobs for continuous discovery and enrichment.
- **Mobile First**: Fast, responsive UI optimized for busy parents on the go.

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 16.2 (App Router, React 19)
- **Styling**: Tailwind CSS 4
- **Maps**: MapLibre GL JS
- **State Management**: React Query
- **Analytics**: Plausible (Privacy-first)

### Backend
- **Runtime**: Node.js 22 (Express 5)
- **Database**: PostgreSQL 15 + PostGIS (spatial queries, levenshtein deduplication)
- **Caching**: Redis 7
- **Task Queue**: BullMQ (autonomous enrichment engine)
- **Logging**: Pino (structured JSON logging)
- **Process Manager**: PM2

### Data Sources
- **OpenStreetMap (Overpass API)** — Community centres, soft play, leisure centres, gyms, playgrounds, parks
- **Yelp Fusion API** — Business details, ratings, categories
- **Apify (Google Places Scraper)** — Rich data: images, opening hours, emails, reviews
- **Brave Search API** — Real-time fallback for venue discovery and web scraping
- **Nominatim** — Reverse geocoding for postcode/address/borough enrichment
- **FHRS** — Food hygiene ratings for relevant venues
- **Council Open Data** — Community hall CSV feeds from London borough councils
- **Charity Commission** — Registered charity venues (Scout huts, village halls)

---

## 🔄 Autonomous Enrichment Engine

KidSpot runs a **self-scheduling BullMQ worker** that continuously enriches venue data without manual intervention. The worker registers repeatable jobs on startup that fire automatically on a cron schedule.

### Enrichment Pipeline (6 Layers)

```
Layer 0: Nominatim Reverse-Geocoding → postcode, address, borough
Layer 1: OSM Contact Enrichment     → website, phone, email from Overpass tags
Layer 2: Web Scraper Enrichment     → Brave Search + HTML scraping for contact info
Layer 3: Yelp Details Enrichment    → opening hours, photos, ratings (Free, 5,000 requests/day)
Layer 4: Apify Google Places        → images, opening hours, ratings, emails (Google Places fallback)
Layer 5: Smart Parks                → Auto-generated OSM map links for parks
```

### Scheduled Jobs

| Job | Schedule | Batch Size | Purpose |
|:----|:---------|:----------:|:--------|
| `enrich-geocode` | Every 4 hours | 200 | Fill missing postcodes and addresses |
| `enrich-osm-contacts` | Every 6 hours | 200 | Extract contact info from OSM tags |
| `enrich-web-scrape` | Every 8 hours | 30 | Brave Search + HTML scraping |
| `discover-yelp-grid` | Weekly (Sunday 01:00) | — | Borough-based Yelp softplay grid discovery |
| `enrich-yelp-details`| Daily at 04:00 UTC | 30 | Batch Yelp details (hours, photos, rating) enrichment |
| `enrich-apify` | Daily at 03:00 UTC | 20 | Google Places via Apify actor |
| `dedup-sweep` | Weekly (Sunday) | — | Merge duplicate venues |
| `run-discovery` | Weekly (Monday) | — | Full OSM + Yelp discovery run |

### GitHub Actions Pipelines

| Pipeline | Action | Schedule | Description |
|:---------|:-------|:---------|:------------|
| **Party Venue Discovery** | `party-discovery.yml` | Every 6 hours | Council halls, charity halls, OSM party venues |
| **Venue Expansion** | `venue-expansion.yml` | Every 12 hours | School lettings and church/parish halls |
| **Data Enrichment** | `data-enrichment.yml` | Every 4 hours | Triggers full enrichment pipeline |
| **Stale Venue Refresh** | `discovery.yml` | Scheduled | Re-scrapes outdated venue data |

### Pipeline Architecture

```
                    ┌─────────────────────┐
                    │   GitHub Actions     │
                    │   (cron triggers)    │
                    └──────────┬──────────┘
                               │ HMAC-signed POST
                               ▼
                    ┌─────────────────────┐
                    │   Express API       │
                    │   (admin.ts)        │
                    └──────────┬──────────┘
                               │ Adds job to queue
                               ▼
┌──────────────────────────────────────────────────────┐
│              BullMQ Discovery Queue                   │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Geocode  │ │ OSM      │ │ Web      │ │ Apify   │ │
│  │ (4h)     │ │ Contacts │ │ Scraper  │ │ (daily) │ │
│  │          │ │ (6h)     │ │ (8h)     │ │         │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       │            │            │            │       │
│       └────────────┴─────┬──────┴────────────┘       │
│                          ▼                            │
│              ┌─────────────────────┐                  │
│              │  PostgreSQL+PostGIS │                  │
│              │  (COALESCE/NULLIF)  │                  │
│              └─────────────────────┘                  │
└──────────────────────────────────────────────────────┘
```

---

## 🚦 Getting Started

### Prerequisites
- Docker and Docker Compose
- API Keys for:
  - **Brave Search API** (Required for fallback search and web scraping)
  - **Yelp Fusion API** (Required for venue discovery)
  - **Apify** (Optional — for Google Places enrichment)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/CiscoPonce/kidspot-london.git
   cd kidspot-london
   ```

2. **Configure Environment Variables**:
   Copy the example env files and fill in your API keys:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

3. **Launch with Docker**:
   ```bash
   docker compose up -d
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

---

## 📁 Project Structure

```
kidspot-london/
├── .github/workflows/              # CI/CD and automated data pipelines
│   ├── ci.yml                      # Build, lint, and test
│   ├── party-discovery.yml         # Party venue discovery (every 6h)
│   ├── venue-expansion.yml         # Schools & churches (every 12h)
│   ├── data-enrichment.yml         # Enrichment pipeline trigger (every 4h)
│   └── discovery.yml               # Stale venue refresh
├── .planning/                      # Development roadmap and phase docs
├── backend/
│   ├── src/
│   │   ├── server.ts               # Express app entrypoint
│   │   ├── worker.ts               # BullMQ autonomous enrichment engine
│   │   ├── routes/admin.ts         # Authenticated ingest API endpoints
│   │   ├── services/
│   │   │   ├── venueService.ts     # Search, details, click tracking
│   │   │   ├── apifyService.ts     # Apify webhook processor
│   │   │   ├── yelpService.ts      # Yelp Fusion API client
│   │   │   ├── fhrsService.ts      # Food hygiene ratings
│   │   │   └── claimService.ts     # Venue claiming flow
│   │   ├── clients/                # PostgreSQL and Redis clients
│   │   └── utils/slugify.ts        # Shared slug generation
│   ├── scripts/
│   │   ├── cron-agent.ts           # Stale venue refresh agent
│   │   └── discovery/              # Discovery pipeline scripts
│   │       ├── run-discovery.ts    # Orchestrates all discovery
│   │       ├── data-enrichment.ts  # 6-layer enrichment orchestrator
│   │       ├── osm-discovery.ts    # OpenStreetMap venue import (Enhanced tags)
│   │       ├── yelp-discovery.ts   # Yelp Fusion venue import
│   │       ├── dedup-sweep.ts      # Spatial deduplication (200m + levenshtein)
│   │       └── sources/
│   │           ├── enrichment.ts           # Layer 0: Nominatim reverse-geocoding
│   │           ├── osm-contact-enrichment.ts # Layer 1: Overpass contact extraction
│   │           ├── web-scraper-enrichment.ts # Layer 2: Brave + HTML scraping
│   │           ├── yelp-grid-softplay.ts   # Phase 17.5: Borough grid Yelp discovery
│   │           ├── yelp-details-enrichment.ts # Layer 3: Yelp opening hours & photos
│   │           └── apify-enrichment.ts     # Layer 4: Apify Google Places
│   ├── run-migration-023.js        # Phase 17.5 migration runner
│   └── db/
│       ├── schema.sql              # Full PostgreSQL + PostGIS schema (Updated)
│       └── migrations/             # Incremental database migrations
│           └── 023_fix_insert_venue_function.sql # Fix constraint function signature
├── frontend/
│   └── src/                        # Next.js 16 App Router
│       ├── app/                    # Pages and layouts
│       ├── components/             # Reusable UI components
│       └── lib/api.ts              # API client
└── docker-compose.yml              # Full stack orchestration (5 services)
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

---

## 🔧 Environment Variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `BRAVE_API_KEY` | ✅ | Brave Search API key |
| `YELP_API_KEY` | ✅ | Yelp Fusion API key |
| `INGEST_SIGNING_SECRET` | ✅ | HMAC key for admin endpoints |
| `CORS_ORIGIN` | ✅ | Allowed frontend origin(s) |
| `APIFY_TOKEN` | Optional | Apify API token for Google Places enrichment |
| `NODE_ENV` | Optional | `production` or `development` |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
