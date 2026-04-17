---
phase: "01-data-foundation"
plan: "02"
subsystem: database
tags:
  - postgresql
  - postgis
  - spatial-queries
  - sponsor-system
  - lean-database
dependency_graph:
  requires:
    - "01-01 (VPS provisioning, Docker Compose)"
  provides:
    - "Database foundation for venue storage"
    - "Spatial query infrastructure"
    - "Sponsor system schema"
  affects:
    - "Phase 2: Continuous Discovery & Categorization"
    - "Phase 3: Agentic Search API"
tech_stack:
  added:
    - "PostgreSQL 15 + PostGIS 3.3"
    - "fuzzystrmatch extension (Levenshtein distance)"
  patterns:
    - "Lean database approach (minimal local storage)"
    - "Sponsor-aware result ranking"
    - "Spatial GIST indexing for fast radius queries"
    - "Deduplication via proximity + string similarity"
key_files:
  created:
    - "backend/db/init.sql"
    - "backend/db/schema.sql"
    - "backend/db/migrations/001_create_venues_table.sql"
    - "backend/db/test_spatial.sql"
decisions:
  - "Store only essential venue data locally (name, location, type, source)"
  - "Fetch full details on-demand via agentic search"
  - "Use PostGIS GIST index on geography type for spatial queries"
  - "Rank sponsored results: tier (gold>silver>bronze>none) > priority > distance"
  - "Use Levenshtein distance < 4 AND 50m proximity for deduplication"
metrics:
  duration: "33s"
  completed: "2026-04-15T11:28:37Z"
  tasks_completed: 3
  files_created: 4
  commits: 3
---

# Phase 01 Plan 02: PostgreSQL + PostGIS with Minimal Venue Schema

## One-liner

PostgreSQL database with PostGIS spatial extensions, minimal venues table with sponsor fields, spatial GIST indexing, and sponsor-aware search function.

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create database initialization script | `720f401` | `backend/db/init.sql` |
| 2 | Create minimal database schema with PostGIS and sponsor fields | `e903397` | `backend/db/schema.sql` |
| 3 | Create migration script and test spatial queries | `fb8c07e` | `backend/db/migrations/001_create_venues_table.sql`, `backend/db/test_spatial.sql` |

## What Was Built

### Database Initialization (`backend/db/init.sql`)
- Creates `kidspot` database if not exists using `SELECT ... WHERE NOT EXISTS`
- Connects to kidspot database via `\c kidspot`
- Imports full schema via `\i schema.sql`

### Minimal Database Schema (`backend/db/schema.sql`)
**Extensions enabled:**
- `postgis` - Spatial queries via `ST_MakePoint`, `ST_DWithin`, `ST_Distance`
- `fuzzystrmatch` - Levenshtein distance for deduplication

**Venues table columns:**
- `id` BIGSERIAL PRIMARY KEY
- `name` TEXT NOT NULL
- `lat` DOUBLE PRECISION NOT NULL
- `lon` DOUBLE PRECISION NOT NULL
- `type` TEXT NOT NULL (softplay, community_hall, park, other)
- `source` TEXT NOT NULL (google, yelp, tripadvisor, osm, manual)
- `source_id` TEXT UNIQUE
- `last_scraped` TIMESTAMPTZ
- `sponsor_tier` TEXT (NULL, bronze, silver, gold)
- `sponsor_priority` INTEGER
- `is_active` BOOLEAN DEFAULT TRUE
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Indexes created:**
- Spatial GIST index on `ST_MakePoint(lon, lat)::geography`
- Type index on `type` column
- Source index on `source` column
- Sponsor partial index on `(sponsor_tier, sponsor_priority)` WHERE `sponsor_tier IS NOT NULL`
- Active venues partial index WHERE `is_active = TRUE`
- `last_scraped` index for cron agent stale detection

**Functions implemented:**
- `is_duplicate_venue(new_name, new_lat, new_lon)` - Returns true if similar venue exists within 50m
- `insert_venue_if_not_duplicate(...)` - Safe insert with deduplication
- `search_venues_by_radius(lat, lon, radius_meters, type_filter, limit)` - Sponsor-aware radius search
- `update_venue_scrape_time(venue_id)` - Updates last_scraped timestamp
- `deactivate_venue(venue_id)` - Marks venue inactive
- `get_venues_needing_scrape(stale_hours)` - Returns stale venues for cron agent
- `update_sponsor_tier(venue_id, new_tier, new_priority)` - Sponsor tier management
- `get_sponsor_stats()` - Returns tier counts and percentages

### Migration Script (`backend/db/migrations/001_create_venues_table.sql`)
- Identical to schema.sql for version-controlled migration management
- Supports future migration tooling (flyway, node-pg-migrate, etc.)

### Test Suite (`backend/db/test_spatial.sql`)
- 25 comprehensive tests validating:
  - Sample venue insertion
  - Deduplication detection (duplicate within 50m + similar name)
  - Radius search with ST_DWithin
  - Sponsor ranking (gold > silver > bronze > none)
  - Sponsor priority ordering within same tier
  - All CRUD functions
  - Index existence
  - Extension status
  - Inactive venue exclusion

## Verification Results

**Files created:** 4 files
- `backend/db/init.sql` (9 lines)
- `backend/db/schema.sql` (268 lines)
- `backend/db/migrations/001_create_venues_table.sql` (268 lines)
- `backend/db/test_spatial.sql` (143 lines)

**Commits created:** 3 commits
- `720f401` - Database initialization script
- `e903397` - Full schema with PostGIS, sponsor fields, and all functions
- `fb8c07e` - Migration script and 25-test spatial query test suite

**Success criteria met:**
- ✅ Database initialization script is complete
- ✅ Minimal schema includes essential columns (name, lat, lon, type, source, source_id)
- ✅ Sponsor fields present (sponsor_tier, sponsor_priority)
- ✅ PostGIS and fuzzystrmatch extensions enabled
- ✅ Spatial GIST index on location column
- ✅ Type index on type column
- ✅ Sponsor index on sponsor_tier and sponsor_priority
- ✅ is_duplicate_venue function implemented with Levenshtein + 50m proximity
- ✅ search_venues_by_radius function includes sponsor ranking
- ✅ Test script validates all spatial functionality and sponsor ranking

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| none | - | No new trust boundary surface introduced - all SQL is local DB initialization |

## Notes

- Schema follows the "lean database" philosophy from PROJECT.md: store only essential data locally, fetch full details on-demand
- All spatial queries use the `geography` type for correct spherical calculations
- Sponsor ranking follows the monetization strategy: gold > silver > bronze > none, then priority, then distance
- Deduplication uses 50m proximity + Levenshtein distance < 4 (handles minor typos and abbreviations)
- Test suite includes cleanup queries ready for CI/CD integration (commented out in test file)