# KidSpot London - Project State

## Current Position
**Phase**: 17 - High-Velocity Enrichment
**Wave**: Complete
**Status**: 
- **Phase 12 Complete**: Party Portal Reliability live.
- **Phase 17 Complete**: High-velocity enrichment via Apify live.
- **Rich Data live**: Opening hours and images integrated into UI and API.
- **Asynchronous Webhooks live**: Background ingestion from Apify active.
**Last Updated**: May 15, 2026

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
- 12.0 - Party Portal Reliability
- 13.0 - UI/UX Modernization
- 14.0 - Data Enrichment
- 15.0 - Data Quality Enrichment
- 16.0 - Accelerated Enrichment & Partnership
- 17.0 - High-Velocity Enrichment

## Active Phase: 17 - High-Velocity Enrichment
### Objective
Implement a high-velocity data enrichment pipeline using Apify, including schema upgrades for rich data, asynchronous webhooks, and deep contact extraction.

### Accomplishments (May 15, 2026)
- ✅ **Apify Integration**: Robust enrichment script using Google Places via Apify.
- ✅ **Pipeline Orchestration**: Apify integrated as Layer 2 in the discovery pipeline.
- ✅ **Rich Data Schema**: Database migration and API/UI updates for opening hours and images.
- ✅ **Asynchronous Webhooks**: Webhook endpoint and background processing service.
- ✅ **Deep Enrichment**: Website crawling and email extraction enabled.

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
