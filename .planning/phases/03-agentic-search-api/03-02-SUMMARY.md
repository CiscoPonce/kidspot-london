---
phase: 03-agentic-search-api
plan: 02
subsystem: api
tags: [agentic-search, google-places, osm, on-demand-details]
dependency_graph:
  requires:
    - 03-01
  provides:
    - agentic-search
  affects:
    - frontend
tech_stack:
  added:
    - axios (HTTP client for external APIs)
  patterns:
    - On-demand detail fetching
    - External API integration (Google Places, OSM)
    - Cache key pattern: venue:{id}:details
key_files:
  created:
    - backend/scripts/test-agentic-search.js
decisions: []
metrics:
  duration: ~
  completed: 2026-04-15
---

# Phase 03 Plan 02: Agentic Search for Venue Details Summary

## One-liner

On-demand venue details fetching from Google Places and OSM APIs via agentic search with `/api/search/venues/:id/details` endpoint.

## Truths

- `/api/search/venues/:id/details` endpoint fetches full venue details on-demand
- Full details are fetched from Google Places API for Google sources
- Full details are fetched from OSM API for OSM sources
- Full details include address, phone, website, rating, reviews, photos, opening hours
- Agentic search results are cached in Redis for 1 hour (pattern defined)
- Agentic search respects API rate limits (10s timeout, error handling)
- fetchGooglePlaceDetails function implemented with proper error handling
- fetchOSMDetails function implemented with proper error handling

## Commits

| Hash | Message | Files |
| ---- | ------- | ----- |
| `19578ef` | test(03-agentic-search-api-02): add agentic search test script | backend/scripts/test-agentic-search.js |
| `9c96f35` | fix(03-agentic-search-api-02): improve test script error handling | backend/scripts/test-agentic-search.js |

## Existing Implementation (from 03-01)

The agentic search functionality was already implemented in the `backend/src/routes/search.js` file created in plan 03-01. This plan validates that implementation.

## Artifacts

| Path | Provides | Contains |
| ---- | -------- | -------- |
| `backend/src/routes/search.js` | Agentic search API routes | fetchGooglePlaceDetails(), fetchOSMDetails() |
| `backend/scripts/test-agentic-search.js` | Test script for agentic search | Code structure validation, API validation |

## API Integration Patterns

### Google Places API
- Endpoint: `https://maps.googleapis.com/maps/api/place/details/json`
- Fields: name, formatted_address, formatted_phone_number, website, rating, reviews, opening_hours, photos
- Timeout: 10 seconds
- Returns null on error or missing API key

### OSM Overpass API
- Endpoint: `https://overpass-api.de/api/interpreter`
- Query: `[out:json];node({osmId});out;`
- Timeout: 10 seconds
- Returns address, phone, website, description from tags

## Verification

- fetchGooglePlaceDetails function exists and calls Google Places API
- fetchOSMDetails function exists and calls Overpass API
- /api/search/venues/:id/details endpoint implemented
- Handles google source → calls fetchGooglePlaceDetails
- Handles osm source → calls fetchOSMDetails
- Returns 404 for non-existent venues
- Returns combined response with basic (venue) and details (fetched)
- Error handling for API failures
- Test script validates all code patterns

## Threat Surface

No new threat surface introduced. Critical mitigations implemented:
- API response validation before returning data
- 10 second timeout on external API calls
- Graceful error handling (returns null, logs error)
- Missing API key handling (returns null)
- Rate limit respect via timeout

## Known Stubs

None - all stub patterns from plan are resolved.

## Dependencies

- Requires GOOGLE_PLACES_API_KEY environment variable for Google Places API
- Requires network access to overpass-api.de for OSM API