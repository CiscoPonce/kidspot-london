# Architecture

**Analysis Date:** 2025-04-15

## Pattern Overview

**Overall:** Decoupled Data Discovery & Core API with Agentic Fallbacks.

**Key Characteristics:**
- **Lean Database Approach:** Minimal data (name, lat/lon, type, source) is stored initially via discovery scripts. Full details are fetched on-demand (Agentic Search).
- **Geospatial-First:** SQL-heavy logic using PostGIS for lightning-fast radius searches combined with sponsor ranking.
- **Continuous Discovery:** Background scripts keep the database fresh and discover new venues without blocking user requests.
- **Graceful Degradation:** Fallback to Brave Search ensures users never hit "zero results" for specific searches.

## Layers

**API Layer (Express):**
- Purpose: Handles user requests, validates inputs, coordinates between DB, Cache, and external APIs.
- Location: `backend/src/server.js`, `backend/src/routes/`
- Contains: Route handlers, input validation, caching logic, agentic search fetching.
- Depends on: `pg` pool, `ioredis`, `axios`.
- Used by: Frontend application.

**Database Layer (PostgreSQL/PostGIS):**
- Purpose: Persistent storage, geospatial indexing, and complex ranking logic.
- Location: `backend/db/`
- Contains: Schema definitions, spatial indexes, stored procedures (PL/pgSQL).
- Depends on: PostGIS extension, fuzzystrmatch extension.
- Used by: API Layer, Data Discovery Layer.

**Data Discovery Layer (Scripts):**
- Purpose: Population and maintenance of the venue database from external sources.
- Location: `backend/scripts/discovery/`, `backend/scripts/cron-agent.js`
- Contains: Ingestion logic for Google Places, OSM, and local CSVs.
- Depends on: Database Layer, External APIs.
- Used by: Manual trigger (npm scripts) or scheduled Cron Agent.

**UI Layer (Next.js):**
- Purpose: Search interface and venue visualization.
- Location: `frontend/src/`
- Contains: App Router components, MapLibre GL integration, TanStack Query providers.
- Depends on: Backend API Layer.
- Used by: End users.

## Data Flow

**Venue Search Flow:**

1. User enters location/radius in Frontend.
2. Frontend calls `/api/search/venues` with lat/lon/radius.
3. Backend checks Redis cache for result.
4. On cache miss:
    a. Backend calls `search_venues_by_radius` (SQL) to find local venues within radius.
    b. If local results are empty, Backend triggers Brave Search API fallback.
5. Backend combines sponsored results (ranked) with regular results.
6. Backend caches final response in Redis and returns to Frontend.
7. Frontend displays venues on Map and List.

**Agentic Detail Flow:**

1. User clicks on a specific venue in Frontend.
2. Frontend calls `/api/search/venues/:id/details`.
3. Backend checks Redis cache for detail.
4. On cache miss:
    a. Backend fetches basic info from local DB.
    b. Backend fetches fresh details from source API (Google/OSM) based on `source_id`.
5. Backend caches details and returns to Frontend.

**State Management:**
- Server-side state: PostgreSQL (persistent), Redis (temporary cache).
- Client-side state: React Query (caching API responses), React `useState` for UI state (selected venue).

## Key Abstractions

**Geospatial Search Function:**
- Purpose: Encapsulates complex spatial query and sponsor ranking logic in SQL.
- Examples: `search_venues_by_radius` in `backend/db/schema.sql`.

**Deduplication Engine:**
- Purpose: Prevents duplicate venues during discovery based on location proximity and name similarity.
- Examples: `is_duplicate_venue` and `insert_venue_if_not_duplicate` in `backend/db/schema.sql`.

**Discovery Scripts:**
- Purpose: Modular scripts for different data sources.
- Examples: `scripts/discovery/google-places-discovery.js`, `scripts/discovery/osm-discovery.js`.

## Entry Points

**API Server:**
- Location: `backend/src/server.js`
- Triggers: Node.js startup.
- Responsibilities: Server configuration, middleware setup, route registration.

**Cron Agent:**
- Location: `backend/scripts/cron-agent.js`
- Triggers: Scheduled execution (planned) or manual run.
- Responsibilities: Identifying stale data and updating venues via source APIs.

**Discovery Runner:**
- Location: `backend/scripts/discovery/run-discovery.js`
- Triggers: Manual execution.
- Responsibilities: Orchestrating discovery from multiple sources.

**Frontend App:**
- Location: `frontend/src/app/page.tsx`
- Triggers: Browser access.
- Responsibilities: Main application layout and user interaction coordination.

## Error Handling

**Strategy:** Fail-safe defaults with graceful degradation.

**Patterns:**
- Try/Catch blocks in route handlers with 500 JSON responses.
- Optional API fallbacks (Brave Search) if core data is missing.
- Client-side loading/error states in React components.

## Cross-Cutting Concerns

**Logging:** Standard console output in backend, tracked via deactivation audit table in DB.
**Validation:** Express-level validation for query parameters in `src/routes/search.js`.
**Authentication:** Simple `ADMIN_KEY` header for administrative routes.

---

*Architecture analysis: 2025-04-15*
