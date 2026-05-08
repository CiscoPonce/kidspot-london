# Phase 12-01 Summary: Enrichment Guardrails

## Accomplishments
Successfully implemented enrichment guardrails and provenance tracking to prevent silent data regressions.

- **Database Guardrails**: Added `editor_locked`, `manual_source`, and `primary_label` columns to the `venues` table.
- **Provenance Tracking**: Created `venue_provenance_log` table and a database trigger to automatically audit changes to critical fields (`type`, `primary_label`, `features`).
- **Cron Agent Protection**: Updated `cron-agent.ts` to respect `editor_locked` and `manual_source` flags, skipping automated updates that would overwrite protected data.
- **Conflict Detection**: Implemented logic in the cron agent to detect and log conflicts when automated sources (Yelp) disagree with trusted sources (OSM, FHRS, manual).
- **Service Layer**: Added `logProvenance`, `checkEditorLocked`, and `getVenueProvenance` helpers to `venueService.ts` for consistent data management.
- **TypeScript Safety**: Updated all interfaces to include guardrail fields and resolved project-wide type errors related to request parameter handling.

## Verification Results
- ✅ **Migration**: Applied `013_add_guardrails.sql` successfully.
- ✅ **Type Safety**: `npm run typecheck` passes with zero errors across the backend.
- ✅ **Provenance Logic**: Verified via `src/tests/guardrails.test.ts` that manual and automatic changes are correctly logged.
- ✅ **Guardrail Functionality**: Verified that `editor_locked` and `manual_source` status can be correctly checked.
- ✅ **Trigger Audit**: Confirmed that direct database updates to `type` trigger an automatic provenance log entry with `system:trigger` source.

## Next Steps
- Proceed to **Phase 12-02: Multi-Facet Schema** to replace the single `type` with a more flexible `parent_facets` array.
- Begin curation of manual seeds for key London party venues to leverage the new guardrails.
