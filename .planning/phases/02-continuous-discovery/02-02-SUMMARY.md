---
phase: 02-continuous-discovery
plan: 02
type: execute
subsystem: discovery
tags:
  - venue-categorization
  - type-mapping
  - osm
  - google-places
  - csv-import
dependency_graph:
  requires:
    - 02-01
  provides:
    - venue-type-mapping
  affects:
    - backend/scripts/cron-agent.js
    - backend/scripts/discovery/osm-discovery.js
    - backend/scripts/import-london-datastore.js
    - backend/db/schema.sql
tech_stack:
  added:
    - test-categorization.js (test script)
  patterns:
    - Type mapping functions for consistent venue categorization
    - Priority-based tag matching (leisure tags before amenity tags)
    - Cross-source consistency validation
key_files:
  created:
    - backend/scripts/test-categorization.js
  modified:
    - backend/scripts/cron-agent.js (added mapVenueType to exports)
    - backend/scripts/discovery/osm-discovery.js (added mapVenueType function)
    - backend/scripts/import-london-datastore.js (added mapVenueType to exports)
decisions:
  - OSM type mapping prioritizes leisure tags over amenity tags for consistency with plan specification
  - All type mapping functions return 'other' for unknown types with warning logs
  - Test script validates cross-source consistency (same input should map to same output)
metrics:
  duration: "~5 minutes"
  completed: "2026-04-15T12:06:00Z"
  tasks_completed: 4
  tests_passed: 38
  tests_failed: 0
---

# Phase 02 Plan 02 Summary: Venue Categorization Logic

## One-liner

Venue categorization logic classifying venues by type (softplay, community_hall, park, other) from Google Places, OSM, and CSV sources with 38 passing tests.

## What Was Built

Implemented venue type mapping functions to classify venues from all discovery sources into our internal type system: `softplay`, `community_hall`, `park`, and `other`.

### Google Places Type Mapping (cron-agent.js)
- `mapVenueType(googleTypes[])` function maps Google Places API types to venue types
- Mappings: amusement_park→softplay, bowling_alley→other, community_center→community_hall, gym→other, park→park, playground→park, stadium→other, swimming_pool→other, tourist_attraction→other, zoo→other
- Returns 'other' for unmapped types

### OSM Tag Mapping (osm-discovery.js)
- `mapVenueType(tags)` function maps OSM tags to venue types
- Priority order: leisure tags first, then amenity tags
- Mappings: leisure=fitness_centre→softplay, amenity=community_centre→community_hall, leisure=park→park, leisure=playground→park, leisure=stadium→other, amenity=gym→other
- Returns 'other' for unmapped tags with warning log

### CSV Type Mapping (import-london-datastore.js)
- `mapVenueType(csvType)` function normalizes and maps CSV type strings
- Case-insensitive matching
- Mappings: leisure centre→softplay, soft play→softplay, softplay→softplay, community hall→community_hall, village hall→community_hall, park→park, playground→park, sports centre→other, gym→other, swimming pool→other
- Returns 'other' for unknown types

### Test Suite (test-categorization.js)
- 38 tests covering all three mapping functions
- Cross-source consistency tests verify same venue types map identically across sources
- All tests passing

## Truths Verified

- ✅ Venues are correctly categorized by type (softplay, community_hall, park, other)
- ✅ Google Places types are mapped to our venue types
- ✅ OSM tags are mapped to our venue types
- ✅ CSV data types are mapped to our venue types
- ✅ Categorization logic is consistent across all sources
- ✅ Uncategorized venues are logged for review

## Artifacts

| Path | Provides |
|------|----------|
| backend/scripts/cron-agent.js | Cron agent with Google Places mapVenueType function |
| backend/scripts/discovery/osm-discovery.js | OSM discovery with mapVenueType function |
| backend/scripts/import-london-datastore.js | CSV import with mapVenueType function |
| backend/scripts/test-categorization.js | Test suite validating all type mappings |

## Commits

- `c838d93`: feat(02-02): add OSM tag mapping to venue types
- `ed04d97`: test(02-02): add venue categorization test script

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Export] Added mapVenueType to module.exports**
- **Found during:** Task 4 (test creation)
- **Issue:** mapVenueType functions existed in cron-agent.js and import-london-datastore.js but were not exported, causing test failures
- **Fix:** Added mapVenueType to each module's exports
- **Files modified:** backend/scripts/cron-agent.js, backend/scripts/import-london-datastore.js

**2. [Rule 1 - Bug] OSM tag iteration order caused wrong precedence**
- **Found during:** Task 4 (test execution)
- **Issue:** Test "multiple tags returns first match" failed because amenity tags were checked before leisure tags
- **Fix:** Rewrote mapVenueType to use explicit if/else chain with leisure tags first (higher priority)
- **Files modified:** backend/scripts/discovery/osm-discovery.js

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| N/A | - | No new security surface introduced - all type mappings are version-controlled code with no external trust boundaries |

## Verification Results

- ✅ Google Places type mapping is implemented and exported
- ✅ OSM tag mapping is implemented with correct precedence
- ✅ CSV type mapping is implemented and exported
- ✅ All mappings return correct venue types
- ✅ Unmapped types return 'other'
- ✅ Test script validates all mappings (38/38 passing)
