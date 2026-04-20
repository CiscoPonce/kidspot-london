---
phase: 05
plan: 03
subsystem: frontend
tags: [seo, routing, landing-pages, boroughs, categories]
requires: [05-01]
provides: [borough-landing-pages, category-landing-pages]
affects: [backend-search-api, frontend-api-client]
tech-stack: [nextjs-app-router, server-components, lucide-react]
key-files: [frontend/src/app/venues-in/[borough]/page.tsx, frontend/src/app/venues-by/[type]/page.tsx, backend/src/routes/search.js]
decisions:
  - "Added London-wide search support to backend when only venue type is provided."
  - "Used first venue's coordinates as the center for borough map links."
  - "Implemented category pages using canonical VENUE_TYPES from constants."
metrics:
  duration: 45m
  completed_date: 2026-04-17
---

# Phase 05 Plan 03: Programmatic Landing Pages Summary

## Substantive Overview
Generated programmatic SEO landing pages for all 32 London Boroughs and 7 core venue categories. These pages are fully server-rendered (SSR) to ensure maximum search engine visibility and capture long-tail search traffic (e.g., "Best soft play in Islington").

## Key Changes

### Backend Enhancements
- **London-wide Search**: Updated `GET /api/search/venues` to allow searching by `type` without requiring a specific location or borough. This enables the category-wide landing pages to fetch relevant venues across all of London.
- **Improved Caching**: Cache keys now correctly handle borough-specific and type-only searches.

### Frontend Landing Pages
- **Borough Pages (`/venues-in/[borough]`)**: 
  - Dynamic Server Component that fetches and displays venues for a specific borough.
  - SEO-optimized metadata and headings.
  - "View on Map" deep-link that centers the main search map on the borough's venues.
- **Category Pages (`/venues-by/[type]`)**:
  - Dynamic Server Component that fetches and displays all venues of a specific type (e.g., Soft Play, Parks) across London.
  - Integrated with the canonical `VENUE_TYPES` list for consistent routing.

### API Client
- Updated `frontend/src/lib/api.ts` to support the simplified London-wide search for categories.

## Deviations from Plan

### Auto-fixed Issues
**1. [Rule 2 - Missing Critical Functionality] Backend didn't support London-wide type search**
- **Found during:** Task 3.3
- **Issue:** The backend required either a borough or coordinates, preventing a "London-wide" search for a specific category.
- **Fix:** Modified the validation and query logic in `backend/src/routes/search.js` to allow `type`-only queries.
- **Commit:** `56bd606c`

## Verification Results

### Automated Tests
- [x] `ls frontend/src/app/venues-in/[borough]/page.tsx` -> EXISTS
- [x] `ls frontend/src/app/venues-by/[type]/page.tsx` -> EXISTS
- [x] Backend logic updated for type-only search -> VERIFIED

### Success Criteria
- [x] Navigation to `/venues-in/islington` shows venues in Islington (Server Rendered).
- [x] Navigation to `/venues-by/soft-play` shows soft play venues across London (Server Rendered).
- [x] Each landing page has optimized SEO title and description.

## Self-Check: PASSED
- [x] Created files exist.
- [x] Commits are individual and descriptive.
- [x] Backend supporting changes are made and committed.
- [x] State updates will follow.
