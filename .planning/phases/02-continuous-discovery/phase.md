# Phase 2: Continuous Discovery & Categorization

## Overview

Phase 2 builds the continuous discovery and categorization system that keeps venue data fresh and properly categorized. This phase implements a cron agent that periodically discovers new venues, updates existing venue information, categorizes venues by type, and marks inactive venues.

**Duration:** Weeks 3-4
**Status:** Planned
**Plans:** 4 plans across 4 waves

## Goals

1. **Cron Agent** - Implement automated system for periodic venue discovery and updates
2. **Categorization** - Build logic to classify venues by type from multiple sources
3. **Stale Detection** - Detect venues that need updating based on last_scraped timestamp
4. **Venue Deactivation** - Mark permanently closed venues as inactive

## Requirements Addressed

- **DISCOVER-01**: Implement cron agent for periodic scraping
- **DISCOVER-02**: Build venue categorization logic
- **DISCOVER-03**: Implement stale venue detection
- **CRON-01**: Continuous data freshness

## Architecture: Continuous Discovery

**Cron Agent Schedule:**
- Runs every 24 hours (configurable)
- Processes venues in batches of 50
- Prioritizes sponsored venues for updates
- Respects API rate limits

**Discovery Sources:**
- Google Places API (venue discovery and updates)
- OpenStreetMap (Overpass API) (venue discovery)
- London Datastore CSVs (initial seed data)

**Categorization:**
- Map Google Places types to our venue types
- Map OSM tags to our venue types
- Map CSV types to our venue types
- Default to 'other' for unmapped types

**Data Freshness:**
- Stale threshold: 24 hours (configurable)
- Sponsored venues prioritized for updates
- Permanently closed venues marked inactive
- Inactive venues excluded from search

## Plans

### Wave 1: Cron Agent

#### Plan 02-01: Implement cron agent for periodic venue scraping

**Objective:** Build automated system that periodically discovers new venues, updates existing venue information, and maintains data freshness.

**Files Created:**
- `backend/scripts/cron-agent.js` - Cron agent for continuous venue scraping
- `backend/package.json` - Updated with cron script

**Features:**
- Periodic execution (configurable schedule)
- Processes venues that need scraping (stale data)
- Updates venue information from sources
- Marks permanently closed venues as inactive
- Prioritizes sponsored venues for updates
- Respects API rate limits
- Logs all operations

**Security Considerations:**
- Validate API responses before updating database
- Use parameterized queries for all database updates
- Respect API rate limits
- Log all cron operations for auditability

### Wave 2: Categorization

#### Plan 02-02: Build venue categorization logic

**Objective:** Ensure all venues are correctly categorized by type (softplay, community_hall, park, other) regardless of data source.

**Files Updated:**
- `backend/scripts/cron-agent.js` - Google Places type mapping
- `backend/scripts/discovery/osm-discovery.js` - OSM tag mapping
- `backend/scripts/import-london-datastore.js` - CSV type mapping

**Features:**
- Map Google Places types to our venue types
- Map OSM tags to our venue types
- Map CSV types to our venue types
- Consistent categorization across all sources
- Log unmapped types for review
- Default to 'other' for unmapped types

**Venue Types:**
- softplay - Soft play centres, amusement parks
- community_hall - Community centres, village halls
- park - Parks, playgrounds
- other - Everything else (gyms, sports centres, swimming pools, etc.)

### Wave 3: Stale Detection

#### Plan 02-03: Implement stale venue detection and automatic updates

**Objective:** Detect venues that haven't been updated recently and prioritize them for refresh.

**Files Updated:**
- `backend/scripts/cron-agent.js` - Stale venue detection logic
- `backend/db/schema.sql` - get_venues_needing_scrape function and last_scraped index

**Features:**
- Detect venues based on last_scraped timestamp
- Configurable stale threshold (default 24 hours)
- Efficient detection using database index
- Prioritize sponsored venues for updates
- Batch processing (100 venues per batch)
- Report summary statistics

**Performance:**
- Index on last_scraped for efficient queries
- Limit results to prevent large result sets
- Batch processing to prevent overwhelming APIs

### Wave 4: Venue Deactivation

#### Plan 02-04: Add venue deactivation for permanently closed venues

**Objective:** Detect permanently closed venues via Google Places API and mark them as inactive.

**Files Updated:**
- `backend/scripts/cron-agent.js` - Permanently closed detection
- `backend/db/schema.sql` - deactivate_venue function and is_active index

**Features:**
- Detect permanently closed venues via Google Places API
- Mark venues as inactive
- Inactive venues excluded from search results
- Deactivation is reversible (venue can be reactivated)
- Log deactivation for auditability

**Data Quality:**
- Inactive venues preserved in database
- Can be reactivated if venue reopens
- Search only returns active venues
- is_active index for efficient filtering

## Success Criteria

- [ ] Cron agent runs periodically (configurable schedule)
- [ ] Cron agent processes venues that need scraping
- [ ] Cron agent updates venue information from sources
- [ ] Cron agent marks permanently closed venues as inactive
- [ ] Cron agent prioritizes sponsored venues for updates
- [ ] Cron agent respects API rate limits
- [ ] All venues are correctly categorized by type
- [ ] Type mappings are consistent across all sources
- [ ] Stale venues are detected efficiently
- [ ] Sponsored venues are prioritized for updates
- [ ] Permanently closed venues are detected and marked inactive
- [ ] Inactive venues are excluded from search results
- [ ] Deactivation is reversible
- [ ] All operations are logged for auditability

## Dependencies

**External Services Required:**
- Google Places API key (for venue discovery and updates)
- Cron scheduling (crontab or systemd timer)

**Phase Dependencies:**
- Phase 1: Data Foundation (database schema, discovery scripts)

## Next Steps

After completing Phase 2:
1. Verify cron agent runs correctly
2. Test categorization across all sources
3. Verify stale venue detection
4. Test venue deactivation
5. Set up cron job for periodic execution
6. Proceed to Phase 3: Agentic Search API & Sponsor System

## Execution

Execute all plans in this phase:

```bash
/gsd-execute-phase 02
```

Or execute individual waves:

```bash
/gsd-execute-phase 02 --wave 1  # Cron agent
/gsd-execute-phase 02 --wave 2  # Categorization
/gsd-execute-phase 02 --wave 3  # Stale detection
/gsd-execute-phase 02 --wave 4  # Venue deactivation
```

## Verification

After execution, verify phase completion:

```bash
/gsd-verify-phase 02
```

This will check:
- All plans completed successfully
- All must-have criteria met
- Cron agent runs correctly
- Categorization works across all sources
- Stale venue detection is efficient
- Venue deactivation works correctly
- No security vulnerabilities introduced
