# Phase 12-07 Summary — Verification & Exposure

## Goal

Close the gap between **Phase 12 plumbing** (Waves 12-01 → 12-06) and **Phase 12 product outcomes**: prove the engine is wired end-to-end, surface what wasn't yet delivered, and baseline reliability so Phase 13 can be measured.

## Accomplishments

- **Migration `020_phase12_07_lock_facets_repair.sql`**:
  - Created the missing `venue_source_claims` convergence table (operator service was inserting into it but it never existed).
  - Set `editor_locked = TRUE` for every `source = 'manual'` row (was 0/1, now 1/1).
  - Repaired Atherton Leisure Centre: `type = 'softplay'`, `parent_facets = {soft_play, party_room, activity_session}`, `primary_label = 'Soft Play'`, locked.
  - Recreated `search_venues_by_radius` to return **`parent_facets`** and to widen its filter so a `softplay` chip query also matches venues whose `type` is something else but whose `parent_facets` contains `soft_play` (same widening applied for `community_hall`/`hall_hire`, `museum`/`museum_programme`, `park`/`outdoor_play`).
- **`venueService.ts`**:
  - `updateVenueFromOpenActive` is now strictly additive on facets — leaves `soft_play`, `party_room`, `trampoline` etc. intact while attaching `activity_session`.
  - `venueService` is type-pinned to `typeof baseVenueService`, so all methods (incl. `getVenueById`) appear on the public surface.
  - `getVenueById`, `getVenueFacets`, `updateVenueFacets` added to named exports for direct import.
- **TS errors cleared (6 → 0)**: `String(req.params.X ?? '')` casts in `claimController.ts`, `ownerController.ts`, `searchController.ts`, and `ownerAuth.ts`.
- **Coverage harness (`backend/scripts/coverage-eval.ts`)** + frozen panel `evaluation-postcodes-v1.csv` (50 stratified postcodes).
- **Verification doc (`12-VERIFICATION.md`)** with reproducible commands and honest gap log.

## Verification (server, post-deploy)

- `curl /api/search/venues?lat=51.54297&lon=0.012152&radius=5&type=softplay&limit=12` returns **Atherton Leisure Centre at 0.18 mi** as the top result with `parent_facets = ['soft_play','party_room','activity_session']`.
- API typecheck: **0 errors**.
- Manual lock rate: **1/1 (100%)**.
- `venue_source_claims` table: **exists**.
- §11 coverage panel: **50/50 (100%)** — see `baselines/2026-05-09.json`.

## Honest gaps still open (logged in `12-VERIFICATION.md` §5)

- `fhrs_establishments`, `openactive_locations`, `borough_csv_records` are still empty in production. The pipelines are wired, but no real ingestion has run.
- Coverage harness uses the legacy `type` parameter; promote to `facets[]` once the search API exposes it as a public route.
- Non-operator enrichment paths still write to `venue_provenance_log` but not to `venue_source_claims`. Phase 13 should standardise.

## Outcome

Phase 12 is **engine-complete and trustworthy** as of 2026-05-09. Product-completeness (volume of corroborated venues, OpenActive sessions live, FHRS-backed trust pill) is deferred to Phase 13.
