# KidSpot London 🇬🇧

**KidSpot London** is a hyper-local search engine designed to solve the data fragmentation problem for parents looking for child-friendly venues in London. By combining public datasets, intelligent agentic discovery, and real-time web search fallbacks, KidSpot provides an instant, geo-aware directory of safe, age-appropriate locations for parties, play, and gatherings.

---

## 🚀 Key Features

- **Hyper-Local Search**: Search by postcode or current location with a customizable radius (1-10 miles).
- **Agentic Discovery**: Real-time integration with Brave Search API to ensure "zero-result" searches never happen. If it's on the web, KidSpot will find it.
- **On-Demand Venue Details**: Minimizes data decay by fetching the latest venue info (opening hours, ratings, photos) directly from Google Places and OpenStreetMap on-demand.
- **Programmatic SEO**: 33+ dedicated area pages (e.g., "Venues in Islington") and category-specific landing pages (e.g., "Soft Play in London").
- **Sponsor System**: Multi-tiered monetization engine (Gold, Silver, Bronze) for featured local business listings.
- **Automated Data Pipelines**: 4 GitHub Actions continuously discover, expand, and enrich venue data around the clock.
- **Mobile First**: Fast, responsive UI optimized for busy parents on the go.

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 16.2 (App Router)
- **Styling**: Tailwind CSS
- **Maps**: MapLibre GL JS
- **State Management**: React Query
- **Analytics**: Plausible (Privacy-first)

### Backend
- **Runtime**: Node.js 22 (Express)
- **Database**: PostgreSQL 15 + PostGIS (Official arm64 supported image)
- **Caching**: Redis
- **Task Queue**: BullMQ (for background discovery)
- **Process Manager**: PM2

---

## 🔄 Automated Data Pipelines

KidSpot runs **4 automated GitHub Actions** that continuously discover and enrich venue data without any manual intervention. Each pipeline securely triggers an authenticated API endpoint on the production server via HMAC-signed HTTP requests.

| Pipeline | Action | Schedule | Description |
|----------|--------|----------|-------------|
| **Party Venue Discovery** | `party-discovery.yml` | Every 6 hours | Discovers council halls, charity halls (Scout huts, community centres), and OSM party-friendly venues |
| **Venue Expansion** | `venue-expansion.yml` | Every 12 hours | Finds school lettings and church/parish halls available for hire across London |
| **Data Enrichment** | `data-enrichment.yml` | Every 4 hours | Reverse-geocodes venues to fill in missing postcodes, addresses, and borough data (30 venues per batch) |
| **Stale Venue Refresh** | `discovery.yml` | Scheduled | Re-scrapes outdated venue data to keep listings fresh and accurate |

### Data Sources

- **OpenStreetMap (Overpass API)** — Community centres, soft play, trampoline parks, playgrounds, schools, churches
- **Council Open Data** — Community hall CSV feeds from London borough councils
- **Charity Commission** — Registered charity venues (Scout huts, village halls)
- **Nominatim** — Free reverse geocoding for postcode/address enrichment
- **Brave Search API** — Real-time fallback for venue discovery
- **Google Places API** — Rich venue details (photos, ratings, hours)

### Pipeline Architecture

```
GitHub Actions (cron)
    │
    ▼
curl → POST /api/admin/ingest/{parties|expansion|enrichment|stale}
    │   (HMAC-signed request)
    ▼
Express API (admin.ts)
    │
    ▼
Discovery Scripts (backend/scripts/discovery/)
    │
    ▼
PostgreSQL + PostGIS (upsert with deduplication)
```

### GitHub Secrets & Variables Required

| Name | Type | Description |
|------|------|-------------|
| `INGEST_SIGNING_SECRET` | Secret | HMAC key for authenticating pipeline requests |
| `API_URL` | Variable | Production API base URL (e.g., `http://your-server:4000`) |

---

## 🚦 Getting Started

### Prerequisites
- Docker and Docker Compose
- API Keys for:
  - **Brave Search API** (Required for fallback search)
  - **Google Places API** (Required for rich venue details)

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
   # Edit backend/.env with your BRAVE_API_KEY and GOOGLE_PLACES_API_KEY
   ```

3. **Launch with Docker**:
   ```bash
   docker compose up -d
   ```

4. **Access the application**:
   - **Frontend**: `http://localhost:3005`
   - **API**: `http://localhost:4000/api/search/venues`
   - **Health Check**: `http://localhost:4000/health`

---

## 📁 Project Structure

```
kidspot-london/
├── .github/workflows/          # CI/CD and automated data pipelines
│   ├── ci.yml                  # Build, lint, and test
│   ├── party-discovery.yml     # Party venue discovery (every 6h)
│   ├── venue-expansion.yml     # Schools & churches (every 12h)
│   ├── data-enrichment.yml     # Reverse geocoding enrichment (every 4h)
│   └── discovery.yml           # Stale venue refresh
├── backend/
│   ├── src/
│   │   ├── routes/admin.ts     # Authenticated ingest API endpoints
│   │   ├── services/           # Venue search, ingest lock, etc.
│   │   └── clients/            # PostgreSQL and Redis clients
│   ├── scripts/discovery/      # Discovery pipeline scripts
│   │   ├── party-venues-discovery.ts
│   │   ├── venue-expansion.ts
│   │   ├── data-enrichment.ts
│   │   └── sources/            # Individual data source fetchers
│   │       ├── council-halls.ts
│   │       ├── charity-halls.ts
│   │       ├── osm-parties.ts
│   │       ├── school-lettings.ts
│   │       ├── church-halls.ts
│   │       └── enrichment.ts
│   └── db/schema.sql           # PostgreSQL + PostGIS schema
├── frontend/
│   └── src/                    # Next.js 16 App Router
└── docker-compose.yml          # Full stack orchestration
```

---

## 🔍 Local Verification (London)

KidSpot is optimized for London geography. To test the agentic search logic locally:
1. Ensure your **Brave Search API Key** is active in `.env`.
2. Search for a specific London postcode (e.g., `N1 9GU`).
3. If no local records exist, the **London-aware Agent** will trigger, automatically appending "London UK" to your query to find the best local pubs, parks, and halls.

---

## 🛡️ Security & Performance

- **Production Ready**: Uses PM2 Cluster Mode to fully utilize multi-core architectures.
- **HMAC Authentication**: All admin/ingest endpoints are protected with timestamp + SHA-256 signature verification.
- **Rate Limited**: API protection via `express-rate-limit` (60 req/min).
- **Secure Headers**: Implemented `helmet.js` for robust HTTP security.
- **Optimized Caching**: 1-hour Redis cache for all venue details and search results.
- **Deduplication**: PostGIS spatial deduplication prevents duplicate venue entries within 50 meters.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
