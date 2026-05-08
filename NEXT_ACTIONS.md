# Next Actions: Phase 12 — Party Portal Reliability

Phase 8.5, 9, 10, and 11 are **100% complete**.

## Recently landed (May 8, 2026)

- **Phase 12-04: Borough CSV Pack** — automated ingestion of council datasets for parks, halls, and leisure centres with Postcodes.io geocoding.
- **Phase 12-03: FHRS Convergence** — automated matching with FSA data for trust boosting and address cleanup.
- **Phase 12-02: Multi-Facet Schema** — implemented `parent_facets` array with GIN index and frontend filter chips.
- **Phase 12-01: Enrichment Guardrails** — implemented `editor_locked`, `manual_source`, and provenance tracking.
- **TypeScript Health** — Project-wide typecheck passing with zero errors.

## Upcoming (Phase 12 Waves)

1. **Phase 12-05: OpenActive Pilot** — Add session-aware UX using activity feeds.
2. **Phase 12-06: Operator Integration** — Formal partnerships with leisure operators for clean data.

## Verification commands

```bash
# Check provenance log for a specific venue
psql -c "SELECT * FROM venue_provenance_log WHERE venue_id = <ID> ORDER BY created_at DESC LIMIT 5;"

# Confirm typecheck health
cd backend && npm run typecheck
```
