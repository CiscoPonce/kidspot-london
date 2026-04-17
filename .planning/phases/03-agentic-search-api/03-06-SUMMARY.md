---
phase: 03-agentic-search-api
plan: 06
subsystem: backend
tags: [fallback, brave-search, rate-limiting, graceful-degradation]
dependency_graph:
  requires:
    - 03-01
    - 03-05
  provides:
    - search:brave-fallback
    - search:never-zero
  affects:
    - backend/src/routes/search.js
tech_stack:
  added:
    - axios (for Brave Search HTTP calls)
  patterns:
    - fallback pattern (local-first, external-fallback)
    - client-side rate limiting
    - graceful degradation
key_files:
  modified:
    - backend/src/routes/search.js
decisions:
  - "Brave Search fallback: only triggers when local DB returns 0 results"
  - "Rate limit: 1 request per second client-side"
  - "Graceful degradation: returns null when API key not configured or on errors"
  - "429 handling: log warning, skip retry, return null"
metrics:
  duration: ~3 minutes
  tasks_completed: 4
  files_modified: 1
  commits: 1
---

# Phase 03 Plan 06: Brave Search Fallback Implementation Summary

## One-liner

Implemented Brave Search API fallback that triggers when local database returns 0 results, ensuring "never zero" search results with client-side rate limiting and graceful degradation.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Brave Search API integration function | 5e83c6f | backend/src/routes/search.js |
| 2 | Integrate Brave Search fallback into search endpoint | 5e83c6f | backend/src/routes/search.js |
| 3 | Add Brave Search rate limit handling | 5e83c6f | backend/src/routes/search.js |
| 4 | Update response structure for fallback awareness | 5e83c6f | backend/src/routes/search.js |

## What Was Built

### Brave Search Fallback (`fetchBraveSearchResults`)

- **Trigger:** Only when local `search_venues_by_radius` returns 0 results AND `BRAVE_API_KEY` is configured
- **Search query:** `{type} venues near {lat},{lon} within {radiusMiles} miles London UK`
- **Endpoint:** `https://api.search.brave.com/res/v1/web/search`
- **Headers:** `Accept: application/json`, `X-Subscription-Token: {BRAVE_API_KEY}`
- **Response transform:** Maps Brave Search results to venue-like structure with `source: 'brave'`
- **Cache TTL:** 1 hour (same as local results)

### Rate Limiting

- **Client-side enforcement:** 1 request per second minimum interval
- **Implementation:** Tracks `lastBraveSearchTime` globally, sleeps if needed before request
- **429 handling:** Detects rate limit response, respects `Retry-After` header, returns null without retry

### Graceful Degradation

- **No API key:** Returns `null`, fallback disabled, search continues normally
- **Brave Search error:** Logs error, returns `null`, search continues normally
- **429 response:** Logs warning, returns `null`, search continues normally

### Response Meta Fields

```json
{
  "fallback_source": "brave_search" | null,
  "fallback_count": 0 | number,
  "fallback_triggered": boolean
}
```

## Commits

- **5e83c6f** feat(03-06): add Brave Search fallback for empty local results

## Deviations from Plan

### Auto-fixed Issues

**None - plan executed exactly as written.**

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| None | - | No new threat surface introduced |

All mitigations from the threat model are implemented:
- Client-side rate limiting prevents API abuse (T-03-06-04)
- 429 responses handled gracefully (T-03-06-04)
- No API key = fallback disabled (graceful degradation)
- Results validated before being returned (T-03-06-02)
- Fallback only triggers when local returns 0 results (T-03-06-05)

## Verification

```bash
# Without BRAVE_API_KEY (graceful degradation)
curl "http://localhost:4000/api/search/venues?lat=51.5&lon=-0.12&radius_miles=5"

# With BRAVE_API_KEY configured (fallback triggers on 0 local results)
curl "http://localhost:4000/api/search/venues?lat=51.5&lon=-0.12&radius_miles=50"
# Response meta should contain: fallback_source, fallback_count, fallback_triggered
```

## Known Stubs

None - all functionality fully implemented.
