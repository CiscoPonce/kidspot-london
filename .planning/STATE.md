# KidSpot London - Project State

## Current Position
**Phase**: 12 - Party Portal Reliability
**Wave**: 7 - Verification & Exposure (engine-complete)
**Status**: 
- **Phase 11 Complete**: Search Experience V2 live.
- **Guardrails Live**: Phase 12-01 completed.
- **Multi-Facet Model Live**: Phase 12-02 completed.
- **FHRS Integrated**: Phase 12-03 completed.
- **Borough CSV Ingest Live**: Phase 12-04 completed.
- **OpenActive Pilot Live**: Phase 12-05 completed; real-time activity feeds and scheduled sessions integrated for leisure centres.
- **Operator Integration Live**: Phase 12-06 completed; partnership-first ingestion for leisure chains and trampoline parks implemented.
- **Verification & Exposure**: Phase 12-07 completed; manual seeds auto-locked, `parent_facets` exposed in spatial search, `venue_source_claims` table created, Atherton soft-play regression repaired, 50/50 panel coverage baselined.
**Last Updated**: May 9, 2026

## Completed Phases
- 01 - Data Foundation
- 02 - Continuous Discovery
- 03 - Agentic Search API
- 04 - Frontend Core
- 05 - SEO & Detail Pages
- 06 - Polish & Launch
- 07 - Improvement
- 07.5 - Cleanup Sprint
- 08.0 - Framework Modernization & Polish
- 08.5 - UX & Data Quality Verification
- 09.0 - Sponsorship & Revenue
- 10.0 - Sponsor Features & Engagement
- 11.0 - Search Experience V2

## Active Phase: 12 - Party Portal Reliability
### Objective
Implement multi-source data architecture with provenance tracking and enrichment guardrails to become the main London portal for kids' parties.

### Accomplishments (May 9, 2026)
- ✅ **Guardrails Schema**: `editor_locked` and `manual_source` columns added.
- ✅ **Provenance Log**: Audit table and database trigger active.
- ✅ **Multi-Facet Search**: `parent_facets` implemented with OR semantics.
- ✅ **FHRS Convergence**: Automated matching with FSA data.
- ✅ **Borough CSV Pack**: Automated ingestion of high-value council datasets.
- ✅ **OpenActive Pilot**: Real-time activity feeds integrated for Better Leisure and Everyone Active.
- ✅ **Session-Aware UX**: `activity_session` facet and automated matching active.
- ✅ **Operator Integration**: Partnership-first ingestion for leisure chains and trampoline parks.
- ✅ **Verification & Exposure (12-07)**: Auto-lock for `source = 'manual'`, `parent_facets` returned by `search_venues_by_radius`, `venue_source_claims` table created, Atherton repair, 50-postcode coverage harness producing 100% pass baseline (`baselines/2026-05-09.json`).

### Decisions
- **2026-05-02**: Moving to Phase 10 to focus on sponsor value delivery (D-10-01).
- **2026-05-02**: Decided to implement OTP-based owner login for simplicity and security (D-10-02).

---

## Project Context

### Tech Stack (Latest)
- **Frontend**: Next.js 15 (React 19), TailwindCSS 4, MapLibre GL JS 5
- **Backend**: Node.js 22, Express 5, BullMQ, Pino Logging
- **Data/AI**: PostgreSQL 15 + PostGIS, Redis 7, Brave Search API, Yelp Fusion API
- **Infrastructure**: Docker Compose on ARM VPS, GitHub Actions (Cron)

### Key Constraints
- Focus Area: Greater London
- Data Accuracy: High priority on opening hours and pricing visibility.
- Traffic Proofing: Need to track user clicks to external booking/website pages.

---

## Environment Variables Required

### Database
- `DB_PASSWORD`: PostgreSQL database password

### AI & External Services
- `OPENROUTER_API_KEY`: OpenRouter API key
- `BRAVE_API_KEY`: Brave Search API key
- `YELP_API_KEY`: Yelp Fusion API key
- `YELP_CLIENT_ID`: Yelp Fusion Client ID

### Security
- `ADMIN_KEY`: Admin key for manual actions
- `INGEST_SIGNING_SECRET`: HMAC secret for GitHub Actions

---

## Next Steps
1. **Phase 12 product-complete (Wave 13.x):**
   - Backfill FHRS for the §11 panel + ≥ 50% of active venues.
   - Run real OpenActive feed ingestion (confirm publisher URLs first).
   - Smoke-test borough CSV URLs and ingest the 3 seeded sources end-to-end.
   - Standardise non-operator enrichment paths to write `venue_source_claims`.
2. Re-run `coverage-eval.ts` and improve panel pass rate by ≥ 10 pp over the 2026-05-09 baseline.
3. Proceed to Phase 13 (Search Experience V2 enhancements or next milestone) once metrics are met.
