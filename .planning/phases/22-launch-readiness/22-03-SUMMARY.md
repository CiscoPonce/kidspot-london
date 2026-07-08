---
phase: 22-launch-readiness
plan: 03
subsystem: backend, frontend
tags: fhrs, food-hygiene, bullmq, batch-matching, enrichment, detail-page
requires:
  - phase: 18C
    provides: Venue interface with fhrs_establishment_id, fhrsService.ts with similarity matching
  - phase: 22
    provides: research and decisions on FHRS approach (D-09, D-10)
provides:
  - DB migration adding fhrs_rating_value, fhrs_rating_date, fhrs_matched_at to venues
  - FHRS batch match script for background BullMQ job
  - Daily enrich-fhrs-batch BullMQ repeating job registration
  - GET /api/fhrs/match/:id lazy on-demand matching endpoint
  - FHRS score card on venue detail pages (0-5 rating with date)
  - Venue interface with fhrs_rating_value and fhrs_rating_date fields
affects: launch-readiness, detail-page-rendering, trust-signals
tech-stack:
  added: []
  patterns:
    - FHRS batch matching follows existing enrichment script pattern (google-places-enrichment.ts)
    - COALESCE/NULLIF write-safe pattern on all UPDATE queries
    - BullMQ repeating job with daily 8am cron, 50 venues per batch
    - Lazy on-demand matching triggered by detail page view
    - Denormalized rating fields on venues table for fast reads (no JOIN)
key-files:
  created:
    - backend/db/migrations/038_add_fhrs_venue_rating_fields.sql — Adds fhrs_rating_value, fhrs_rating_date, fhrs_matched_at to venues with IF NOT EXISTS guards
    - backend/scripts/discovery/sources/fhrs-batch-match.ts — Batch match script exports batchMatchFhrs() and FhrsBatchResult interface
    - backend/src/controllers/fhrsController.ts — GET /api/fhrs/match/:id lazy on-demand FHRS matching endpoint
    - backend/src/routes/fhrs.ts — Express Router mounting fhrsController
  modified:
    - backend/src/worker.ts — Added enrich-fhrs-batch job registration (daily 8am) and processJob case handler
    - backend/src/server.ts — Imported and mounted /api/fhrs routes
    - frontend/src/lib/api.ts — Added fhrs_rating_value and fhrs_rating_date to Venue interface
    - frontend/src/components/venues/venue-detail-content.tsx — FHRS score card rendered between description and opening hours
key-decisions:
  - "Migration numbered 038 instead of 034 (034_cluster_venues_by_location.sql already existed)"
  - "Daily 8am schedule for FHRS batch job — gives FHRS API time to update overnight per A-03"
  - "50 venues per batch — keeps within free tier limits (600 req/min)"
  - "90-day retry window for unmatched venues before re-processing"
  - "COALESCE/NULLIF write-safe on all UPDATEs to prevent empty strings overwriting valid data (T-22-07)"
requirements-completed:
  - 22-T1
duration: 1 min
completed: 2026-07-08
---

# Phase 22: Launch Readiness — Plan 03 Summary

**FHRS hybrid batch+lazy matching: DB migration, BullMQ batch job, on-demand API endpoint, and venue detail page score card**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-08T11:44:36Z
- **Completed:** 2026-07-08T11:46:47Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- DB migration 038 adds `fhrs_rating_value TEXT`, `fhrs_rating_date TIMESTAMPTZ`, `fhrs_matched_at TIMESTAMPTZ` to `venues` (IF NOT EXISTS safe) with partial index on unmatched venues
- Batch match script (`fhrs-batch-match.ts`) queries venues without FHRS ID, matches via FHRS API by name+postcode, upserts into `fhrs_establishments` and updates denormalized venue fields
- `enrich-fhrs-batch` BullMQ repeating job registered at daily 8am (50 venues/batch) with proper case handler in `processJob()` switch
- `GET /api/fhrs/match/:id` endpoint with input validation (positive integer), cached FHRS data return, lazy on-demand matching via `fhrsService.matchFhrsToVenue()`, and UPSERT+UPDATE patterns
- FHRS score card on venue detail page showing rating value out of 5 with formatted date (between description and opening hours sections)
- Venue TypeScript interface updated with `fhrs_rating_value?: string | null` and `fhrs_rating_date?: string | null`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DB migration for FHRS venue rating fields and batch match script** — `6cace43` (feat)
2. **Task 2: Add enrich-fhrs-batch BullMQ repeating job to worker** — `5013709` (feat)
3. **Task 3: Create FHRS controller, route, Venue type fields, and detail page score card** — `fe07a2c` (feat)

## Files Created/Modified

- `backend/db/migrations/038_add_fhrs_venue_rating_fields.sql` — Migration adds denormalized FHRS rating fields to venues table
- `backend/scripts/discovery/sources/fhrs-batch-match.ts` — Batch match script with FhrsBatchResult interface
- `backend/src/controllers/fhrsController.ts` — Lazy FHRS match controller with input validation and error handling
- `backend/src/routes/fhrs.ts` — Express route mounting GET /match/:id
- `backend/src/server.ts` — Updated with fhrsRoutes import and app.use registration
- `backend/src/worker.ts` — Added enrich-fhrs-batch job registration and case handler
- `frontend/src/lib/api.ts` — Added fhrs_rating_value and fhrs_rating_date to Venue interface
- `frontend/src/components/venues/venue-detail-content.tsx` — FHRS score card with conditional rendering

## Decisions Made

- **Migration 038 instead of 034** — `034_cluster_venues_by_location.sql` already exists, used next available number (038)
- **Daily 8am scheduling** — Per A-03 agent discretion: gives FHRS API time to update overnight, keeps within 600 req/min free tier with 50-venue batch
- **90-day retry window** — Unmatched venues marked with `fhrs_matched_at = NOW()` and re-attempted after 90 days
- **COALESCE/NULLIF write-safety** — All UPDATEs use write-safe pattern per T-22-07 (prevents empty strings overwriting valid data)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration number 034 already taken**
- **Found during:** Task 1 (Create DB migration)
- **Issue:** Plan specified `034_add_fhrs_venue_rating_fields.sql` but `034_cluster_venues_by_location.sql` already exists
- **Fix:** Used next available number `038_add_fhrs_venue_rating_fields.sql`
- **Files modified:** backend/db/migrations/038_add_fhrs_venue_rating_fields.sql
- **Verification:** TypeScript compilation passes, file correctly named
- **Committed in:** `6cace43` (Task 1 commit)

**2. [Rule 3 - Blocking] Express v5 req.params typing requires cast**
- **Found during:** Task 3 (Create FHRS controller)
- **Issue:** `req.params.id` is typed as `string | string[]` in Express v5, causing TS2345 error
- **Fix:** Added `as string` cast: `parseInt(req.params.id as string, 10)`
- **Files modified:** backend/src/controllers/fhrsController.ts
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** `fe07a2c` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for correctness. Migration number change has no functional impact. Type cast matches existing project patterns.

## Issues Encountered

None - all deviations auto-fixed during execution.

## User Setup Required

None - no external service configuration required. FHRS API is free and requires no API key.

## Threat Surface Scan

- **T-22-07 (Tampering):** Mitigated — COALESCE/NULLIF write-safe pattern on all UPDATE queries in both batch script and controller
- **T-22-08 (Information Disclosure):** Accepted — FHRS ratings are public government data, venue ID is numeric and non-sensitive
- **T-22-09 (Denial of Service):** Mitigated — `/api/fhrs/match/:id` route is behind existing global `apiLimiter` (60 req/min/IP, Redis-backed)
- **T-22-10 (Spoofing):** Mitigated — `fhrsService.matchFhrsToVenue` uses >0.7 similarity threshold with business-type relevance check
- **T-22-SC (Supply Chain):** Mitigated — No new packages added

## Next Phase Readiness

- FHRS hybrid batch+lazy matching fully implemented
- Ready for next Phase 22 plan tasks
- Manual DB migration required: `038_add_fhrs_venue_rating_fields.sql` needs to be applied against the production database
- Manual verification: visit a venue detail page for a matched venue and confirm FHRS score card renders correctly

## Self-Check: PASSED

- ✅ All 8 created/modified files exist on disk
- ✅ All 3 commits found in git log
- ✅ Backend TypeScript compiles without errors (`npx tsc --noEmit`)
- ✅ Frontend TypeScript compiles without errors (`npx tsc --noEmit`)
- ✅ Migration SQL adds 3 columns with IF NOT EXISTS guards and partial index
- ✅ Batch match script exports `batchMatchFhrs()` and `FhrsBatchResult` interface
- ✅ Controller validates positive integer venue ID, returns 400/404/500 correctly
- ✅ Route file follows exact pattern from `routes/search.ts`
- ✅ Venue interface has `fhrs_rating_value` and `fhrs_rating_date` optional fields
- ✅ Detail page renders FHRS score card conditionally (only when `fhrs_establishment_id` exists)

---

*Phase: 22-launch-readiness*
*Completed: 2026-07-08*
