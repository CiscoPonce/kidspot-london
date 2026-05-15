---
phase: 17
plan: 03
subsystem: backend, infrastructure
tags: apify, enrichment, monitoring, github-actions
dependency_graph:
  requires: [17-02]
  provides: [17-04]
  affects: [backend-api, data-pipeline]
tech_stack:
  added: []
  patterns: [proxy-metrics]
key_files:
  created: []
  modified:
    - backend/scripts/discovery/data-enrichment.ts
    - backend/scripts/discovery/sources/apify-enrichment.ts
    - backend/src/routes/admin.ts
    - .github/workflows/data-enrichment.yml
decisions:
  - use-opening-hours-as-proxy: Using opening_hours presence as a proxy for Apify enrichment success in stats.
  - batch-size-increase: Set batch size to 50 venues per run to balance velocity and free tier limits.
metrics:
  duration: 15m
  completed_date: 2026-05-10
---

# Phase 17 Plan 03: Scaling & Monitoring Summary

## Substantive One-Liner
Scaled Apify enrichment throughput to 300 venues/day and added rich data tracking (opening hours, images) to the admin dashboard.

## Key Accomplishments

### 1. Scaling Throughput
- Increased `enrichViaApify` batch size from 20 to 50 in `data-enrichment.ts`.
- Updated GitHub Actions workflow documentation to reflect the new target of 300 venues/day (6 runs * 50 venues).
- Verified cron schedule remains at every 4 hours, which is optimal for the current free tier strategy.

### 2. Rich Data Monitoring
- Updated `/api/admin/enrichment-stats` to track:
  - **Opening Hours Coverage:** Percentage of active venues with JSON opening hours.
  - **Images Coverage:** Percentage of active venues with at least one image URL.
- Exposed `apify_enriched` in the dashboard using `opening_hours` as a proxy metric.

### 3. Pipeline Robustness
- Updated `apify-enrichment.ts` to actually store `opening_hours` and `images` in the database (previously fetched but not saved).
- Added explicit error handling for Apify HTTP 402 (Insufficient Funds) to provide clear logs when credits are exhausted.
- Refined database queries to handle JSONB and TEXT[] types natively via the pg client.

## Deviations from Plan

### Auto-fixed Issues
**1. [Rule 2 - Missing Functionality] Storing fetched rich data**
- **Found during:** Implementation
- **Issue:** The Apify enrichment script was fetching opening hours and images but not updating the corresponding columns in the `venues` table.
- **Fix:** Added `opening_hours` and `images` to the `UPDATE` query.
- **Files modified:** `backend/scripts/discovery/sources/apify-enrichment.ts`
- **Commit:** 6cb8272

## Self-Check: PASSED
- [x] Batch size increased to 50.
- [x] GHA workflow comment updated.
- [x] Stats endpoint tracks rich data coverage.
- [x] Apify script handles 402 error.
- [x] Commits made for all changes.
