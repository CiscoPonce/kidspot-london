# Technical Overview – KidSpot London (v5 - Automated Discovery + Combined Search)

## 1. System Architecture & VPS Deployment

The system is optimized for an ARM-based Virtual Private Server (VPS). We use Docker Compose to orchestrate the environment, ensuring portability and strict resource boundaries.

### 1.1 Core Stack

**Frontend:** Next.js 15 (React 19), TailwindCSS 4, MapLibre GL JS 5

**Backend:** Node.js 22, Express 5, BullMQ (Task Queue), Pino Logging

**Data/AI:** PostgreSQL 15 + PostGIS, Redis 7 (Caching & Queues), OpenRouter (LLM Parsing), Brave Search API (Fallback), Yelp Fusion API (Discovery & Validation)

### 1.2 Docker Compose Configuration (Latest)

```yaml
services:
  postgres:
    image: kartoza/postgis:15
    environment:
      POSTGRES_USER: kidspot_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: kidspot
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  api:
    build: ./backend
    environment:
      - DATABASE_URL=postgres://kidspot_admin:${DB_PASSWORD}@postgres:5432/kidspot
      - REDIS_URL=redis://redis:6379
      - BRAVE_API_KEY=${BRAVE_API_KEY}
      - YELP_API_KEY=${YELP_API_KEY}
      - YELP_CLIENT_ID=${YELP_CLIENT_ID}
      - INGEST_SIGNING_SECRET=${INGEST_SIGNING_SECRET}
      - ADMIN_KEY=${ADMIN_KEY}
      - NODE_ENV=production
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    build: 
      context: ./backend
      dockerfile: Dockerfile.worker
    environment:
      - DATABASE_URL=postgres://kidspot_admin:${DB_PASSWORD}@postgres:5432/kidspot
      - REDIS_URL=redis://redis:6379
      - YELP_API_KEY=${YELP_API_KEY}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

  web:
    build: ./frontend
    ports:
      - "3005:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://${VPS_IP}:4000/api
    depends_on:
      - api
    restart: unless-stopped

volumes:
  pgdata:
```

## 2. Database Schema (Lean Database Approach)

### 2.1 Philosophy

**Store essential metadata locally:** name, location, type, source, kid_score, rating, last_scraped.

**Self-Healing Data:** A nightly cron job validates every venue against live sources to detect closures and update scores.

### 2.2 Venues Table

```sql
CREATE TABLE venues (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    type TEXT NOT NULL,           -- 'softplay', 'community_hall', 'park', etc.
    source TEXT NOT NULL,         -- 'yelp', 'osm', 'manual'
    source_id TEXT UNIQUE,        -- External ID (e.g. Yelp Business ID)
    rating DOUBLE PRECISION,
    user_ratings_total INTEGER,
    kid_score INTEGER DEFAULT 0,
    last_scraped TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. Discovery & Validation Pipeline

### 3.1 Nightly Cron Agent (`cron-agent.ts`)

A unified TypeScript agent that runs every night at 02:00 UTC via GitHub Actions.

**Tasks:**
1. **Validation:** Checks 100 oldest venues for `is_closed` status via Yelp Fusion API. Updates ratings and recalculates Kid Scores.
2. **Discovery:** Performs keyword-based searches (e.g., "soft play") across London using Yelp and OpenStreetMap to find brand-new venues.

### 3.2 Rate Limiting (Yelp Fusion)
To respect the Yelp free tier QPS:
- **Concurrency:** 1 (Serial processing)
- **Delay:** 1500ms between requests
- **Daily Batch:** 100 validations + ~200 discovery searches.

## 4. Agentic Search & Fallbacks

### 4.1 Search Flow

1. **Local Search:** Query PostgreSQL/PostGIS for active venues within radius.
2. **Combined Fallback:** If local results = 0, simultaneously query:
   - **OpenStreetMap (Overpass):** For parks, halls, and public spaces.
   - **Brave Search API:** For commercial venues and recent web listings.
3. **Merge & Sort:** Results are merged, deduplicated by name, and sorted using **Haversine Distance** calculated on-the-fly.

### 4.2 OSM Query Refinement
Query uses specific tags (`leisure=indoor_play`, `amenity=community_centre`) to ensure results are strictly relevant to kids' activities.

## 5. Deployment & Security

### 5.1 GitHub Actions
- **Discovery Pipeline:** Uses `INGEST_SIGNING_SECRET` to send HMAC-signed POST requests to the `/api/admin/ingest/stale` endpoint.

### 5.2 VPS Access
- Application is accessible via Port 3005 (Web) and Port 4000 (API).

---

**Last Updated:** April 24, 2026
**Version:** 5.0 - Automated Discovery + Combined Search
