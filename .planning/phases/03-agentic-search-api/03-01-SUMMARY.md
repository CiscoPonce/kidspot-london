---
phase: 03-agentic-search-api
plan: 01
subsystem: api
tags: [express, search, spatial, sponsor-ranking]
dependency_graph:
  requires:
    - 02-01
  provides:
    - search-api
  affects:
    - frontend
tech_stack:
  added:
    - express
    - helmet
    - cors
    - express-rate-limit
  patterns:
    - REST API
    - Spatial queries with PostGIS
    - Sponsor-tier ranking
key_files:
  created:
    - backend/src/server.js
    - backend/src/routes/search.js
    - backend/scripts/test-search-api.js
decisions: []
metrics:
  duration: ~
  completed: 2026-04-15
---

# Phase 03 Plan 01: Express API with Spatial Search Summary

## One-liner

Express API server with `/api/search/venues` endpoint supporting spatial radius search and sponsor-tier result ranking (gold > silver > bronze > none).

## Truths

- Express API server is running on port 4000
- `/api/search/venues` endpoint accepts lat, lon, radius_miles, type, limit parameters
- `/api/search/venues` endpoint returns venues with sponsor ranking
- `/api/search/venues` endpoint separates sponsored and regular results
- `/api/search/venues` endpoint includes sponsor metadata
- Spatial queries use `search_venues_by_radius` function
- Results are ordered by sponsor tier, then distance
- API returns JSON with success, data, and meta fields

## Commits

| Hash | Message | Files |
| ---- | ------- | ----- |
| `bd80725` | feat(03-agentic-search-api-01): create Express server with search API routes | backend/src/routes/search.js |
| `de9ab16` | test(03-agentic-search-api-01): add search API test script | backend/scripts/test-search-api.js |

## Deviations from Plan

None - plan executed exactly as written.

## Artifacts

| Path | Provides | Contains |
| ---- | -------- | -------- |
| `backend/src/server.js` | Express server with all routes | app.listen(4000), helmet, cors, rateLimit |
| `backend/src/routes/search.js` | Search API routes with sponsor ranking | router.get('/venues'), search_venues_by_radius |

## Verification

- Express server starts on port 4000
- `/api/search/venues` accepts lat, lon, radius_miles, type, limit parameters
- Results are ordered by sponsor tier (gold > silver > bronze > none)
- Within same tier, results ordered by distance
- Sponsored results separated from regular results
- Sponsor metadata (gold_count, silver_count, bronze_count) included in response
- `/api/search/venues/:id/details` fetches full venue details via agentic search
- Test script validates all functionality

## Threat Surface

No new threat surface introduced. All mitigations from threat model are implemented:
- Rate limiting (60 req/min per IP)
- Input validation
- Parameterized SQL queries
- Helmet.js security headers
- CORS configuration
