---
phase: 06-polish-and-launch
reviewed: 2025-05-15T10:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - backend/src/server.js
  - backend/src/routes/search.js
  - backend/src/routes/sponsors.js
  - backend/src/utils/slug.js
  - backend/scripts/cron-agent.js
  - backend/scripts/discovery/osm-discovery.js
  - backend/scripts/discovery/google-places-discovery.js
  - backend/db/schema.sql
  - backend/db/migrations/002_add_slugs.sql
  - frontend/src/lib/api.ts
  - frontend/src/app/page.tsx
  - frontend/src/hooks/use-search.tsx
  - frontend/src/components/search/search-bar.tsx
  - frontend/src/components/venues/venue-list.tsx
  - frontend/src/app/venues-by/[type]/page.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2025-05-15
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The KidSpot London codebase is well-structured and follows a modern "lean database + agentic search" approach. The use of PostGIS for spatial queries and Redis for caching provides a solid performance foundation. However, several critical bugs were identified in the data retrieval logic and the fallback search mechanism that could lead to "Venue Not Found" errors for users. Additionally, some performance anti-patterns in Redis usage and development artifacts leaking into the UI should be addressed before the final launch.

## Critical Issues

### CR-01: Incomplete OSM Data Retrieval

**File:** `backend/src/routes/search.js:378`
**Issue:** The `fetchOSMDetails` function only queries the Overpass API for `node` elements. OpenStreetMap represents many larger venues (parks, community centers, sports facilities) as `way` or `relation` elements rather than simple nodes.
**Fix:**
```javascript
async function fetchOSMDetails(osmId) {
  try {
    // Check if ID is likely a way or relation if it's very large, 
    // or better, query all types in the Overpass query
    const response = await axios.get(`https://overpass-api.de/api/interpreter`, {
      params: {
        data: `[out:json];(node(${osmId});way(${osmId});relation(${osmId}););out;`
      },
      timeout: 10000
    });
    // ... rest of the logic
```

### CR-02: Broken Details Flow for Fallback Results

**File:** `backend/src/routes/search.js:141`
**Issue:** When local search yields zero results, the system triggers a Brave Search fallback. These results are assigned temporary IDs (e.g., `brave_...`). However, the `/api/search/venues/:id/details` and slug-based details endpoints only query the local `venues` table. Consequently, any user clicking on a Brave Search result will encounter a 404 error, as the venue does not exist in the database.
**Fix:**
Modify the details endpoint to recognize `brave_` IDs and fetch details directly from the source or a cache, or store temporary "discovered" venues in the database before returning them in the search results.

## Warnings

### WR-01: Blocking Redis Operation

**File:** `backend/src/routes/sponsors.js:28`
**Issue:** `invalidateSearchCaches` uses `redis.keys('search:*')`. This is a blocking O(N) operation that can significantly degrade Redis performance and cause timeouts in production as the number of keys grows.
**Fix:**
Use `redis.scan` to iterate through keys in a non-blocking manner or use a different caching strategy (e.g., versioning or tagging) for bulk invalidation.

### WR-02: Development Artifacts in Production UI

**File:** `frontend/src/app/page.tsx:84, 90`
**Issue:** Breakpoint indicators ("375px Mobile", "1280px Desktop") are hardcoded into the layout and will be visible to end-users in production.
**Fix:**
Wrap these indicators in a conditional check for development mode:
```tsx
{process.env.NODE_ENV === 'development' && (
  <div className="...">...</div>
)}
```

### WR-03: Inefficient Cron Processing

**File:** `backend/scripts/cron-agent.js:115`
**Issue:** The `processStaleVenues` loop processes venues sequentially and lacks a defined limit or concurrency. As the database grows, this single-threaded loop will take increasingly long to complete, potentially overlapping with the next cron run.
**Fix:**
Implement a concurrency limit (e.g., using a library like `p-limit`) or leverage a task queue like BullMQ (which is already in the stack according to `technical_overview.md`) to distribute the scraping tasks.

## Info

### IN-01: Code Duplication: Database Connection Pool

**File:** Multiple files (`backend/src/routes/search.js`, `backend/src/routes/sponsors.js`, `backend/scripts/cron-agent.js`)
**Issue:** Each file initializes its own `pg.Pool`. This can lead to an excessive number of database connections and makes connection pooling harder to manage.
**Fix:**
Create a centralized database utility (e.g., `backend/src/utils/db.js`) that exports a single `Pool` instance.

### IN-02: Missing Frontend Filter UI

**File:** `frontend/src/components/search/search-bar.tsx`
**Issue:** The backend supports filtering by venue type (`softplay`, `park`, etc.), but the main search UI only provides location and radius inputs.
**Fix:**
Add a category selector (Dropdown or Chips) to the `SearchBar` component to allow users to leverage the backend's filtering capabilities.

---

_Reviewed: 2025-05-15T10:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
