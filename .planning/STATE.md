# KidSpot London - Project State

## Current Position
**Phase**: 08.5 - UX & Data Quality Verification
**Wave**: Active Development
**Status**: 
- **Search Fallback Engine**: Robust multi-source engine (OSM + Brave Search) implemented with Haversine distance sorting and deduplication.
- **Automated Pipeline**: Unified nightly validation and discovery pipeline (Yelp Fusion + OSM) fully automated via GitHub Actions.
- **Framework Modernization**: Stack fully upgraded to Node 22, Express 5, Next 15, and React 19.
- **Next Goal**: Prove value and traffic through high data accuracy and refined UX before moving to revenue.
**Last Updated**: April 24, 2026

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

## Active Phase: 08.5 - UX & Data Quality Verification
### Objective
Ensure data accuracy (opening times, prices, fees) and polish the user experience to prove traffic value before monetization.

### Requirements
- [ ] UX-DATA-01: Opening hours display and "Open Now" status validation.
- [ ] UX-DATA-02: Pricing and booking fee transparency in the UI.
- [ ] UX-DATA-03: Direct booking/contact access from venue detail pages.
- [ ] UX-ACC-01: WCAG 2.1 accessibility compliance.
- [ ] UX-TRAF-01: Outbound link tracking for traffic proofing.

### Accomplishments (April 24, 2026)
- ✅ **OSM Search Fallback**: Fixed 406 errors, refactored to native `fetch`.
- ✅ **Unified Fallback Logic**: Combined OSM and Brave Search.
- ✅ **Haversine Distance Sorting**: Dynamic backend sorting for all fallback results.
- ✅ **Discovery Automation**: Integrated Yelp and OSM discovery into nightly pipeline.
- ✅ **GitHub Actions fixed**: Restored ingestion pipeline functionality.

### Decisions
- **2026-04-24**: Creating Phase 8.5 to focus on UX and Data Quality before Revenue (D-08.5-01).
- **2026-04-24**: Merging validation and discovery into a single nightly cron job (D-07.5-02).
- **2026-04-24**: Adopting Yelp Fusion as the primary discovery source over Google Places (D-07.5-01).

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
1. Create implementation plans for Phase 08.5.
2. Verify "Open Now" logic and UI display for venues.
3. Implement outbound click tracking for venues.
