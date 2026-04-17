---
phase: 02-continuous-discovery
plan: 03
type: execute
subsystem: discovery
tags:
  - stale-detection
  - venue-refresh
  - cron-agent
  - database-functions
dependency_graph:
  requires:
    - 02-01
  provides:
    - stale-venue-detection
    - get_venues_needing_scrape
  affects:
    - backend/scripts/cron-agent.js
    - backend/db/schema.sql
tech_stack:
  added:
    - test-stale-detection.js (test script)
  patterns:
    - Stale venue detection based on last_scraped timestamp
    - Sponsor-prioritized refresh ordering
    - Batch processing with rate limiting
key_files:
  created:
    - backend/scripts/test-stale-detection.js
  modified:
    - backend/db/schema.sql (get_venues_needing_scrape function - pre-existing)
    - backend/db/schema.sql (idx_venues_last_scraped index - pre-existing)
    - backend/scripts/cron-agent.js (processStaleVenues function - pre-existing)
decisions:
  - Stale threshold is configurable (default 24 hours)
  - Results limited to 100 venues per batch to prevent DoS
  - Sponsor ordering: gold > silver > bronze > none
  - Never-scraped venues (last_scraped = NULL) are always included
metrics:
  duration: "~2 minutes"
  completed: "2026-04-15T12:07:00Z"
  tasks_completed: 4
  tests_created: 5
---

# Phase 02 Plan 03 Summary: Stale Venue Detection

## One-liner

Stale venue detection identifying venues needing updates based on last_scraped timestamp with sponsor-prioritized ordering and configurable thresholds.

## What Was Built

Implemented stale venue detection system to identify venues that need refreshing based on how long since they were last scraped.

### Pre-existing Components (verified as complete)

The following components were already implemented in the codebase:

**1. get_venues_needing_scrape function (schema.sql)**
- Takes stale_hours parameter (default 24)
- Returns venues where last_scraped is NULL or older than threshold
- Orders by sponsor tier (gold > silver > bronze > none), then last_scraped ASC NULLS FIRST
- Limits to 100 venues per batch
- Returns: id, name, source, source_id, last_scraped

**2. idx_venues_last_scraped index (schema.sql)**
- Index on last_scraped column for efficient queries
- Used by get_venues_needing_scrape function

**3. processStaleVenues function (cron-agent.js)**
- Calls get_venues_needing_scrape with stale threshold
- Processes venues in batches
- Updates venue data via updateVenue function
- Logs progress (processed, updated, deactivated, errors)
- Adds 100ms delay between requests for rate limiting
- Reports summary statistics

### New Test Script

**test-stale-detection.js** validates:
- 24-hour stale threshold correctly identifies stale venues
- Sponsor priority ordering (gold > silver > bronze > none)
- Within-tier ordering by last_scraped (oldest first)
- 100 venue batch limit is respected
- Index is used via EXPLAIN analysis

## Truths Verified

- ✅ Stale venues are detected based on last_scraped timestamp
- ✅ Stale threshold is configurable (default 24 hours)
- ✅ Cron agent processes stale venues in priority order
- ✅ Sponsored venues are prioritized for updates
- ✅ Stale venue detection is efficient (uses database index)
- ✅ Never-scraped venues (last_scraped = NULL) are always included

## Artifacts

| Path | Provides |
|------|----------|
| backend/db/schema.sql | get_venues_needing_scrape function and idx_venues_last_scraped index |
| backend/scripts/cron-agent.js | processStaleVenues function for batch processing |
| backend/scripts/test-stale-detection.js | Test suite validating stale detection |

## Commits

- `0490d15`: test(02-03): add stale venue detection test script

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written. Tasks 1-3 were already implemented in the codebase (verified during execution). Task 4 (test script) was created and committed.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| N/A | - | No new security surface introduced - stale detection uses parameterized SQL queries and respects existing rate limits |

## Verification Results

- ✅ get_venues_needing_scrape function returns correct venues
- ✅ processStaleVenues function processes all stale venues
- ✅ last_scraped index is created and used by queries
- ✅ Stale venues are detected correctly
- ✅ Sponsored venues are prioritized
- ✅ Index is used for efficient queries
- ✅ Test script validates all functionality (5 tests created)
