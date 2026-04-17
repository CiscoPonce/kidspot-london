# External Integrations

**Analysis Date:** 2025-04-15

## APIs & External Services

**Search & Discovery:**
- Google Places API - Used for venue discovery (`scripts/discovery/google-places-discovery.js`) and fetching on-demand venue details (`src/routes/search.js`).
  - SDK/Client: REST API via `axios`.
  - Auth: `GOOGLE_PLACES_API_KEY`.
- OpenStreetMap (OSM) / Overpass API - Alternative source for venue discovery and details (`scripts/discovery/osm-discovery.js`).
  - SDK/Client: REST API via `axios`.
  - Auth: Public endpoint.
- Brave Search API - Fallback for "Zero-Result" searches when the local database returns no venues (`src/routes/search.js`).
  - SDK/Client: REST API via `axios`.
  - Auth: `BRAVE_API_KEY`.

**Geocoding:**
- OpenStreetMap Nominatim - Default geocoding provider (implied in `.env.example`).
  - SDK/Client: REST API.
  - Auth: Optional `GEOCODING_API_KEY`.

**Scraping:**
- Cheerio - Library for parsing HTML from scraped venue pages (`backend/package.json`).

## Data Storage

**Databases:**
- PostgreSQL 15 - Primary persistent store.
  - Connection: `DATABASE_URL`.
  - Client: `pg` pool.
- PostGIS 3.3 - Spatial extension for geospatial indexing and radius-based searches.

**File Storage:**
- Local filesystem (via CSV imports in `backend/data/`).

**Caching:**
- Redis 7 - Used for high-performance caching of search results and venue details.
  - Client: `ioredis`.
  - TTL: 3600 seconds (1 hour).

## Authentication & Identity

**Auth Provider:**
- Custom (minimal/planned).
  - Implementation: `ADMIN_KEY` for administrative routes (`src/server.js`).

## Monitoring & Observability

**Error Tracking:**
- Console logging (Standard output/error).

**Logs:**
- Standard output/error captured by Docker.
- Deactivation log table in PostgreSQL for audit trails (`db/schema.sql`).

## CI/CD & Deployment

**Hosting:**
- Docker Compose based deployment (specified in `docker-compose.yml`).

**CI Pipeline:**
- Not detected.

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string.
- `REDIS_URL` - Redis connection string.
- `GOOGLE_PLACES_API_KEY` - Required for Google discovery/details.
- `BRAVE_API_KEY` - Required for fallback search results.
- `NEXT_PUBLIC_API_URL` - Frontend pointer to backend API.

**Secrets location:**
- `.env` files (not committed).
- Docker environment variables.

## Webhooks & Callbacks

**Incoming:**
- None detected.

**Outgoing:**
- None detected.

---

*Integration audit: 2025-04-15*
