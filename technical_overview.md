# Technical Overview – KidSpot London (v4 - Lean Database + Agentic Search)

## 1. System Architecture & VPS Deployment

The system is optimized for an ARM-based Virtual Private Server (VPS). We use Docker Compose to orchestrate the environment, ensuring portability and strict resource boundaries.

### 1.1 Core Stack

**Frontend:** Next.js (React 18), TailwindCSS, MapLibre GL JS

**Backend:** Node.js 20, Express, BullMQ (Task Queue), Cheerio/Playwright (Scraping)

**Data/AI:** PostgreSQL 15 + PostGIS, Redis (Caching & Queues), OpenRouter (LLM Parsing), Brave Search API (Fallback), Google Places API (Discovery)

### 1.2 Docker Compose Configuration (ARM Optimized)

```yaml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:15-3.3-arm64
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
    build: 
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgres://kidspot_admin:${DB_PASSWORD}@postgres:5432/kidspot
      - REDIS_URL=redis://redis:6379
      - GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY}
      - BRAVE_API_KEY=${BRAVE_API_KEY}
      - ADMIN_KEY=${ADMIN_KEY}
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
      - GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

volumes:
  pgdata:
```

## 2. Database Schema (Minimal - Lean Database Approach)

### 2.1 Philosophy

**Store only essential data locally:** name, location, type, source, sponsor info

**Fetch full details on-demand:** address, phone, website, reviews, photos, opening hours

**Benefits:**
- Fast spatial queries (minimal data)
- Low storage costs
- Always fresh data (fetched from sources)
- Scalable to millions of venues
- Monetization-ready (sponsor system)

### 2.2 Venues Table

```sql
CREATE TABLE venues (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    type TEXT NOT NULL,           -- 'softplay', 'community_hall', 'park', 'other'
    source TEXT NOT NULL,         -- 'google', 'yelp', 'tripadvisor', 'osm', 'manual'
    source_id TEXT UNIQUE,        -- External ID for deduplication
    last_scraped TIMESTAMPTZ,     -- When we last checked this venue
    sponsor_tier TEXT,            -- NULL, 'bronze', 'silver', 'gold'
    sponsor_priority INTEGER,      -- For ranking sponsored results
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast radius queries
CREATE INDEX idx_venues_location ON venues USING GIST(
    ST_MakePoint(lon, lat)::geography
);

-- Sponsor result index
CREATE INDEX idx_venues_sponsor ON venues(sponsor_tier, sponsor_priority) 
WHERE sponsor_tier IS NOT NULL;
```

### 2.3 Key Functions

**Search with Sponsor Ranking:**
```sql
CREATE OR REPLACE FUNCTION search_venues_by_radius(
    search_lat DOUBLE PRECISION,
    search_lon DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION,
    venue_type_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    source TEXT,
    source_id TEXT,
    name TEXT,
    type TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    distance_miles DOUBLE PRECISION,
    sponsor_tier TEXT,
    sponsor_priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.id, v.source, v.source_id, v.name, v.type,
        v.lat, v.lon,
        ST_Distance(ST_MakePoint(v.lon, v.lat)::geography, 
                    ST_MakePoint(search_lon, search_lat)::geography) / 1609.34 AS distance_miles,
        v.sponsor_tier, v.sponsor_priority
    FROM venues v
    WHERE v.is_active = TRUE
    AND ST_DWithin(ST_MakePoint(v.lon, v.lat)::geography, 
                   ST_MakePoint(search_lon, search_lat)::geography, radius_meters)
    AND (venue_type_filter IS NULL OR v.type = venue_type_filter)
    ORDER BY
        -- Sponsored results first (gold > silver > bronze > none)
        CASE
            WHEN v.sponsor_tier = 'gold' THEN 1
            WHEN v.sponsor_tier = 'silver' THEN 2
            WHEN v.sponsor_tier = 'bronze' THEN 3
            ELSE 4
        END,
        -- Within same tier, higher priority first
        v.sponsor_priority DESC NULLS LAST,
        -- Then by distance
        ST_Distance(ST_MakePoint(v.lon, v.lat)::geography, 
                    ST_MakePoint(search_lon, search_lat)::geography) ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

## 3. Discovery Pipeline (Continuous Venue Discovery)

### 3.1 Cron Agent

Runs periodically to:
- Discover new venues from multiple sources
- Update existing venue information
- Categorize venues by type
- Mark inactive venues
- Prioritize sponsored venues

**Cron Schedule:** Every 24 hours (configurable)

**Stale Threshold:** 24 hours (venues older than this are refreshed)

### 3.2 Discovery Sources

**Google Places API:**
- Search for venues by type in London area
- Fetch venue details (name, location, type)
- Update venue information
- Check for permanently closed venues

**OpenStreetMap (Overpass API):**
- Query for leisure centres, community halls, parks
- Extract venue coordinates and names
- Categorize by OSM tags
- Free alternative to paid APIs

**London Datastore (CSV Import):**
- Bulk import from official London datasets
- Geocode postcodes to coordinates
- Categorize venues by type
- Initial seed data

### 3.3 Discovery Scripts

```bash
# Run all discovery sources
npm run discover

# Run specific sources
npm run discover:google
npm run discover:osm

# Run cron agent
npm run cron
```

## 4. Agentic Search (On-Demand Details)

### 4.1 Philosophy

**Store minimal data locally:** Only name, location, type, source

**Fetch full details on-demand:** When user requests venue details, fetch from source

**Benefits:**
- Always fresh data
- Lower storage costs
- Faster initial searches
- Better scalability

### 4.2 Search Flow

1. **User searches** by location and radius
2. **Query local database** for venue references (fast spatial query)
3. **Return results** with sponsor ranking
4. **User clicks venue** → fetch full details from source
5. **Cache results** in Redis for 1 hour

### 4.3 API Endpoints

**Search Venues:**
```javascript
GET /api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=5&type=softplay&limit=50

Response:
{
  "success": true,
  "data": {
    "total": 25,
    "sponsored": {
      "count": 3,
      "venues": [...]  // Gold, silver, bronze results
    },
    "regular": {
      "count": 22,
      "venues": [...]  // Regular results
    },
    "all": [...]  // All results combined
  },
  "meta": {
    "search": { "lat": 51.5074, "lon": -0.1278, "radius_miles": 5 },
    "sponsor_info": {
      "gold_count": 1,
      "silver_count": 1,
      "bronze_count": 1
    }
  }
}
```

**Get Venue Details:**
```javascript
GET /api/search/venues/:id/details

Response:
{
  "success": true,
  "data": {
    "basic": {
      "id": 123,
      "name": "Test Soft Play Centre",
      "type": "softplay",
      "lat": 51.5074,
      "lon": -0.1278,
      "source": "google",
      "sponsor_tier": "gold"
    },
    "details": {
      "address": "123 Test Street, London SW1A 1AA",
      "phone": "020 1234 5678",
      "website": "https://example.com",
      "rating": 4.5,
      "reviews": [...],
      "opening_hours": {...},
      "photos": [...]
    }
  }
}
```

## 5. Sponsor Result System (Monetization)

### 5.1 Sponsor Tiers

**Bronze (£99/month):**
- Appear in top 10 results
- Subtle badge
- Basic analytics

**Silver (£199/month):**
- Appear in top 5 results
- Prominent badge
- Advanced analytics
- Priority support

**Gold (£499/month):**
- Appear in top 3 results
- Featured styling
- Premium analytics
- Dedicated support
- Custom branding

### 5.2 Sponsor Ranking

Results are ordered by:
1. Sponsor tier (gold > silver > bronze > none)
2. Sponsor priority (within same tier)
3. Distance (within same tier and priority)

### 5.3 API Endpoints

**Get Sponsor Statistics:**
```javascript
GET /api/sponsors/stats

Response:
{
  "success": true,
  "data": [
    { "tier": "gold", "count": 5, "percentage": 2.5 },
    { "tier": "silver", "count": 10, "percentage": 5.0 },
    { "tier": "bronze", "count": 20, "percentage": 10.0 },
    { "tier": "none", "count": 165, "percentage": 82.5 }
  ]
}
```

**Update Sponsor Tier (Admin):**
```javascript
PUT /api/sponsors/venues/:id/tier
Headers: X-Admin-Key: ${ADMIN_KEY}
Body: { "tier": "gold", "priority": 100 }

Response:
{
  "success": true,
  "message": "Sponsor tier updated successfully"
}
```

**Get Sponsor Pricing:**
```javascript
GET /api/sponsors/pricing

Response:
{
  "success": true,
  "data": {
    "tiers": {
      "bronze": { "name": "Bronze", "pricing": { "monthly": 99, "yearly": 990 } },
      "silver": { "name": "Silver", "pricing": { "monthly": 199, "yearly": 1990 } },
      "gold": { "name": "Gold", "pricing": { "monthly": 499, "yearly": 4990 } }
    }
  }
}
```

## 6. Caching & Performance

### 6.1 Redis Caching

**Search Results Cache:**
- Key: `search:{lat}:{lon}:{radius_miles}:{type}`
- TTL: 1 hour
- Purpose: Cache search results to reduce database load

**Geocoding Cache:**
- Key: `geocode:{postcode}`
- TTL: 30 days
- Purpose: Cache postcode to coordinate mappings

**Venue Details Cache:**
- Key: `venue:{id}:details`
- TTL: 1 hour
- Purpose: Cache full venue details from external APIs

### 6.2 Performance Optimizations

**Spatial Indexing:**
- GIST index on location column for fast radius queries
- Type index for quick filtering
- Sponsor index for monetization

**Batch Processing:**
- Process venues in batches of 50
- Respect API rate limits
- Parallel processing where possible

**Frontend Optimizations:**
- React Query for request deduplication
- Coordinate rounding (4 decimal places) for cache hits
- Lazy loading of venue details

## 7. Security & Rate Limiting

### 7.1 API Rate Limiting

**Public Endpoints:** 60 requests per minute per IP

**Admin Endpoints:** Require X-Admin-Key header

### 7.2 Security Headers

**Helmet.js:** HSTS, NoSniff, X-Frame-Options

**CORS:** Strict binding to production domain

**Input Validation:** All query parameters validated

### 7.3 Database Security

**Internal Only:** PostgreSQL port not exposed externally

**Parameterized Queries:** All database queries use parameters

**Connection Pooling:** Efficient connection management

## 8. Deployment & Monitoring

### 8.1 Health Checks

**API Health:** `GET /health`

**Database Health:** Check PostgreSQL connection

**Redis Health:** Check Redis connection

### 8.2 Monitoring

**Metrics:**
- Search query count
- Sponsor click-through rate
- API response times
- Error rates

**Logging:**
- Structured JSON logs
- Log levels: error, warn, info, debug
- Log aggregation (e.g., ELK stack)

### 8.3 Scaling

**Horizontal Scaling:**
- Multiple API instances behind load balancer
- Redis for shared caching
- PostgreSQL read replicas for read-heavy workloads

**Vertical Scaling:**
- Increase VPS resources (CPU, RAM)
- Optimize database queries
- Add caching layers

## 9. Future Enhancements

### 9.1 Additional Data Sources

- Yelp API integration
- TripAdvisor API integration
- Facebook Places integration
- Local business directories

### 9.2 Advanced Features

- User reviews and ratings
- Favorite venues
- Search history
- Personalized recommendations
- Real-time availability

### 9.3 Monetization

- Self-service sponsor portal
- Click tracking and analytics
- Dynamic pricing based on location
- Featured listings
- Banner advertisements

## 10. Development Workflow

### 10.1 Local Development

```bash
# Start services
docker-compose up -d

# Initialize database
docker-compose exec postgres psql -U kidspot_admin -d kidspot -f /docker-entrypoint-initdb.d/init.sql

# Run discovery
npm run discover

# Run cron agent
npm run cron

# Start API server
npm run dev
```

### 10.2 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- search.test.js
```

### 10.3 Deployment

```bash
# Build Docker images
docker-compose build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npm run migrate
```

---

**Last Updated:** April 15, 2026
**Version:** 4.0 - Lean Database + Agentic Search
