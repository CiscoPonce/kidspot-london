# Phase 1: Data Foundation

## Overview

Phase 1 establishes the foundational infrastructure and minimal database schema for KidSpot London. This phase provisions the ARM VPS environment, sets up the database with spatial capabilities and sponsor fields, and populates it with initial venue references from multiple discovery sources.

**Duration:** Weeks 1-2
**Status:** Planned
**Plans:** 3 plans across 3 waves

## Goals

1. **Infrastructure Setup** - Provision ARM VPS with Docker Compose environment hosting PostgreSQL, Redis, and API service
2. **Minimal Database Foundation** - Configure PostgreSQL + PostGIS with minimal venue schema (name, location, type, source) and sponsor fields
3. **Initial Discovery** - Implement venue discovery scripts (Google Places, OSM) and initial data import with minimal schema

## Requirements Addressed

- **DATA-01**: Provision ARM VPS with Docker Compose
- **DATA-02**: Configure PostgreSQL + PostGIS with minimal venue schema
- **DATA-03**: Implement venue discovery (Google Places, OSM)
- **INFRA-01**: Setup Docker Compose environment

## Architecture: Lean Database + Agentic Search

**Core Philosophy:** Store only essential venue data locally. Fetch full details on-demand from multiple sources.

**What we store locally:**
- Venue name
- Location (lat/lon)
- Type (softplay, community_hall, park, other)
- Source (Google, OSM, datastore, etc.)
- Source ID (for deduplication)
- Sponsor tier (bronze, silver, gold)
- Sponsor priority (for ranking)
- Last scraped timestamp
- Active status

**What we fetch on-demand:**
- Address and postcode
- Phone number
- Website
- Reviews and ratings
- Photos
- Opening hours
- Full descriptions

**Benefits:**
- Fast spatial queries (minimal data)
- Always fresh data (fetched from sources)
- Low storage costs
- Scalable to millions of venues
- Monetization-ready (sponsor system)

## Plans

### Wave 1: Infrastructure Setup

#### Plan 01-01: Provision ARM VPS and setup Docker Compose environment

**Objective:** Establish the foundational infrastructure that will host all services (database, cache, API) with ARM optimization.

**Files Created:**
- `docker-compose.yml` - Docker Compose orchestration for all services
- `backend/Dockerfile` - API service container image
- `.env.example` - Environment variable template
- `README.md` - Project documentation with lean database approach

**Services:**
- PostgreSQL (PostGIS 15, ARM64) - internal only
- Redis (7-alpine) - internal only
- API (Node.js 20) - exposed on port 4000

**Security Considerations:**
- Non-root container users
- Internal-only database and Redis (no external port exposure)
- Official Docker images with specific tags
- Health checks for all services

### Wave 2: Minimal Database Schema

#### Plan 01-02: Configure PostgreSQL + PostGIS with minimal venue schema and sponsor fields

**Objective:** Establish the database foundation with spatial capabilities for fast geo-queries and sponsor result ranking.

**Files Created:**
- `backend/db/init.sql` - Database initialization script
- `backend/db/schema.sql` - Complete minimal database schema definition
- `backend/db/migrations/001_create_venues_table.sql` - Migration script
- `backend/db/test_spatial.sql` - Spatial query verification tests

**Database Features:**
- PostGIS extension for spatial queries
- fuzzystrmatch extension for deduplication
- Minimal venues table with only essential columns
- Spatial indexing (GIST) for fast radius queries
- Type indexing for quick filtering
- Sponsor indexing for monetization
- Active indexing for filtering
- `is_duplicate_venue` function with Levenshtein distance
- `search_venues_by_radius` function with sponsor ranking
- `update_venue_scrape_time` function
- `deactivate_venue` function
- `get_venues_needing_scrape` function
- `update_sponsor_tier` function
- `get_sponsor_stats` function

**Schema Highlights:**
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
```

**Security Considerations:**
- Parameterized queries (enforced in application code)
- Schema versioning via migrations
- Spatial indexes for performance
- Sponsor indexes for monetization

### Wave 3: Venue Discovery

#### Plan 01-03: Implement venue discovery scripts and initial data import

**Objective:** Populate the database with initial venue references from multiple sources (Google Places, OSM, London Datastore) using minimal schema.

**Files Created:**
- `backend/scripts/discovery/google-places-discovery.js` - Google Places API discovery
- `backend/scripts/discovery/osm-discovery.js` - OpenStreetMap discovery
- `backend/scripts/discovery/run-discovery.js` - Master discovery script
- `backend/scripts/import-london-datastore.js` - CSV import with minimal schema
- `backend/scripts/verify-import.js` - Import verification script
- `backend/data/test-sample.csv` - Test data for verification

**Data Sources:**
- Google Places API (venue discovery)
- OpenStreetMap (Overpass API) (venue discovery)
- London Datastore CSVs (initial seed data)

**Discovery Features:**
- Search for venues by type in London area
- Map external types to our venue types
- Insert only minimal venue data (name, location, type, source)
- Geocode postcodes to coordinates
- Duplicate detection via `is_duplicate_venue`
- Batch inserts for performance
- Comprehensive logging (processed, inserted, duplicates, errors)
- Respect API rate limits

**Security Considerations:**
- CSV structure validation
- Parameterized queries for all inserts
- Geocoding rate limiting and caching
- Import operation logging
- API rate limit respect

## Success Criteria

- [ ] VPS is provisioned with Docker Compose running
- [ ] PostgreSQL + PostGIS extensions are active
- [ ] Minimal venues table with sponsor fields is created
- [ ] Spatial indexes (GIST) are created
- [ ] Sponsor indexes are created
- [ ] Initial venue discovery from Google Places and OSM is working
- [ ] Spatial queries (ST_DWithin) work correctly
- [ ] Sponsor ranking works correctly (gold > silver > bronze > none)
- [ ] All services start without errors
- [ ] Environment variables are properly configured
- [ ] Minimal schema is respected (no address, phone, website, description stored)

## Dependencies

**External Services Required:**
- ARM VPS provider (DigitalOcean, AWS, Hetzner, etc.)
- PostgreSQL database password (32+ chars, mixed case, numbers, symbols)
- Google Places API key (for venue discovery)
- Admin key (for sponsor management)

**Phase Dependencies:**
- None (this is the first phase)

## Next Steps

After completing Phase 1:
1. Verify all services are running correctly
2. Test spatial queries with sample data
3. Test sponsor ranking with sample sponsored venues
4. Review discovered venue data quality
5. Proceed to Phase 2: Continuous Discovery & Categorization

## Execution

Execute all plans in this phase:

```bash
/gsd-execute-phase 01
```

Or execute individual waves:

```bash
/gsd-execute-phase 01 --wave 1  # Infrastructure setup
/gsd-execute-phase 01 --wave 2  # Minimal database schema
/gsd-execute-phase 01 --wave 3  # Venue discovery
```

## Verification

After execution, verify phase completion:

```bash
/gsd-verify-phase 01
```

This will check:
- All plans completed successfully
- All must-have criteria met
- Database contains venue references
- Spatial queries work correctly
- Sponsor ranking works correctly
- Minimal schema is respected
- No security vulnerabilities introduced
