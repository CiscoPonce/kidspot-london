---
phase: 22-launch-readiness
plan: 01
subsystem: data
tags: [google-places, postcodes.io, geocoding, chain-expansion, discovery, enrichment-batch]

# Dependency graph
requires:
  - phase: 21-party-catalogue-maximisation
    provides: venue database, GOOGLE_PLACES_API_KEY env var, existing enrichment patterns
provides:
  - Google Places textSearch() method for API-driven venue discovery
  - Google Places discovery script for finding new venues in under-represented boroughs
  - Chain expansion with Google Places as primary, Apify as fallback
  - Postcodes.io batch geocoding (forward and reverse)
  - Data Max orchestrator running all four sweeps concurrently
affects:
  - 22-02-fhrs-integration (data enrichment patterns)
  - 22-03-launch-readiness (data quality targets)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Discovery/enrichment script pattern (Result interface, async function, CLI entry)
    - Borough-targeted discovery via Google Places Text Search
    - Forward + reverse geocoding via postcodes.io bulk API

key-files:
  created:
    - backend/scripts/discovery/sources/google-places-discovery.ts
    - backend/scripts/discovery/sources/postcodesio-geocoding.ts
    - backend/scripts/discovery/data-max-runner.ts
  modified:
    - backend/src/services/googlePlacesService.ts
    - backend/scripts/discovery/chain-expansion.ts

key-decisions:
  - "Google Places Text Search API used as primary chain expansion source, with Apify as fallback when no results or API key missing"
  - "Postcodes.io chosen over Nominatim for bulk geocoding (free, no API key, simple REST API)"
  - "Data sweeps run concurrently via Promise.allSettled with per-sweep error isolation (D-12)"
  - "Discovery targets boroughs with <100 core venues using category keyword searches"

requirements-completed:
  - 22-D1
  - 22-D2
  - 22-D3
  - 22-D4

# Metrics
duration: 14min
completed: 2026-07-08
---

# Phase 22: Launch Readiness — Plan 01 Summary

**Google Places discovery sweep, postcodes.io batch geocoding, chain expansion with Places API fallback, and concurrent Data Max orchestrator for all four enrichment sweeps**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-08T11:35:00Z
- **Completed:** 2026-07-08T11:38:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Added `textSearch()` method to GooglePlacesService returning multiple results with location bias, radius, and field mask
- Created Google Places discovery script that targets under-represented London boroughs with category keyword searches
- Created postcodes.io batch geocoding script with forward (postcode→lat/lon) and reverse (lat/lon→postcode) passes
- Modified chain-expansion.ts to use Google Places Text Search API as primary, Apify as fallback
- Created data-max-runner.ts orchestrator that runs all four sweeps concurrently via `Promise.allSettled`
- All scripts follow existing enrichment patterns (Result interface, async function, `ON CONFLICT` idempotent inserts, CLI entry point)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add textSearch() + create discovery script** - `b162bb1` (feat)
2. **Task 2: Create postcodes.io batch geocoding** - `cd615e2` (feat)
3. **Task 3: Modify chain expansion + create orchestrator** - `c5c2ccd` (feat)

## Files Created/Modified

- `backend/src/services/googlePlacesService.ts` - Added `GooglePlaceTextSearchResult` interface and `textSearch()` method returning multiple results for text queries with location bias and field mask
- `backend/scripts/discovery/sources/google-places-discovery.ts` - NEW: Discovers new venues in under-represented London boroughs via Google Places Text Search with idempotent inserts
- `backend/scripts/discovery/sources/postcodesio-geocoding.ts` - NEW: Batch forward (postcode→lat/lon) and reverse (lat/lon→postcode) geocoding via postcodes.io API
- `backend/scripts/discovery/chain-expansion.ts` - Modified: Google Places Text Search added as primary search method, Apify retained as fallback
- `backend/scripts/discovery/data-max-runner.ts` - NEW: Orchestrator running Google Places discovery, chain expansion, postcodes.io geocoding, and image enrichment concurrently with per-sweep error isolation

## Decisions Made

- **Google Places as primary search:** Chain expansion now uses the Places Text Search API first (free, fast, no Apify token needed), falling back to Apify when results are empty or API key is missing
- **Postcodes.io for batch geocoding:** Chosen over Nominatim for bulk geocoding because it's free, requires no API key, and supports bulk reverse geocoding (100 per batch)
- **Concurrent sweeps (D-12):** All four sweeps run via `Promise.allSettled()` so one failure never blocks the others
- **Borough-targeted discovery:** Discovery targets boroughs with fewer than 100 core venues, searching with category keywords (soft play, leisure centre, community hall, museum, library)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Threat Surface

No new network endpoints, auth paths, or trust boundary changes introduced. All four scripts are internal CLI tools. No new packages added.

## Next Phase Readiness

Data Max enrichment scripts are ready for execution. Next steps:
- Configure `GOOGLE_PLACES_API_KEY` env var (user setup required)
- Run the Data Max orchestrator: `cd backend && npx tsx scripts/discovery/data-max-runner.ts`
- Or run individual sweeps: `npx tsx scripts/discovery/sources/google-places-discovery.ts`
- Proceed to Plan 02 (FHRS batch matching integration)

---

*Phase: 22-launch-readiness*
*Completed: 2026-07-08*
