# Next Actions: Phase 12 — Party Portal Reliability

Phase 8.5, 9, 10, and 11 are **100% complete**.

## Recently landed (May 8, 2026)

- **Phase 12-02: Multi-Facet Schema** — implemented `parent_facets` array with GIN index and frontend filter chips.
- **Phase 12-01: Enrichment Guardrails** — implemented `editor_locked`, `manual_source`, and provenance tracking.
- **Frontend redesign (Phase 11)** — multi-color filter chips, image-top cards, 50/50 desktop map+results split.
- **Search quality** — Brave fallback gated, OSM softplay broadened, listicle filter active.
- **TypeScript Health** — Project-wide typecheck passing with zero errors.

## Upcoming (Phase 12 Waves)

1. **Phase 12-03: FHRS Convergence** — Integrate Food Hygiene Rating data for address normalization and trust boosting.
2. **Phase 12-04: Borough CSV Pack** — Automate ingestion of high-value council datasets (parks, halls, libraries).
3. **Phase 12-05: OpenActive Pilot** — Add session-aware UX using activity feeds.
4. **Phase 12-06: Operator Integration** — Formal partnerships with leisure operators for clean data.

## Verification commands

```bash
# Check provenance log for a specific venue
psql -c "SELECT * FROM venue_provenance_log WHERE venue_id = <ID> ORDER BY created_at DESC LIMIT 5;"

# Confirm typecheck health
cd backend && npm run typecheck
```
