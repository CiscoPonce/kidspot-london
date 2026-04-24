# KidSpot London - Project State

## Current Position
**Phase**: 07.5 - Cleanup Sprint (Wrapping Up)
**Wave**: Future
**Status**: 
- **Search Fallback Engine**: Robust multi-source engine (OSM + Brave Search) implemented with Haversine distance sorting and deduplication.
- **Automated Pipeline**: Unified nightly validation and discovery pipeline (Yelp Fusion + OSM) fully automated via GitHub Actions.
- **Framework Modernization**: Stack fully upgraded to Node 22, Express 5, Next 15, and React 19.
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

## Active Phase: 07.5 - Cleanup Sprint (Completed)
### Objective
Address lingering technical debt, expand test coverage, and prepare the database schema for the revenue loop before attempting Phase 8 framework upgrades.

### Accomplishments (April 24, 2026)
- ✅ **OSM Search Fallback**: Fixed 406 Not Acceptable errors by refactoring to Node native `fetch` with proper User-Agent and POST parameters.
- ✅ **Unified Fallback Logic**: Backend now queries both OSM and Brave Search simultaneously if local results are zero.
- ✅ **Haversine Distance Sorting**: Implemented dynamic distance calculation for all fallback results to ensure perfect frontend sorting.
- ✅ **Discovery Automation**: Integrated Yelp Fusion and OSM discovery scripts into the nightly `cron-agent.ts`.
- ✅ **Rate Limit Resilience**: Throttled Yelp API requests (Concurrency 1, 1.5s delay) to safely stay within free tier limits.
- ✅ **Database self-healing**: 100 stale venues are validated every night, checking for closures and updating ratings.
- ✅ **GitHub Actions fixed**: Configured missing `INGEST_SIGNING_SECRET` and `API_URL` to restore pipeline functionality.

### Requirements
All requirements completed except deferred items:
- ✅ FIX-01: Fix worker crash loop and service config
- ✅ FIX-02: Fix Brave search coordinate bug
- ✅ FIX-03: Fix Google Places API implementation (v1/FieldMask) -> Replaced by Yelp Fusion
- ✅ SEC-01: Security hardening (HMAC, timing-safe, CSP)
- ✅ PERF-02: Redis-backed rate limiting and caching refactor
- ✅ ARCH-01: Layered backend refactor (Controllers/Services/Clients)
- ✅ ARCH-02: TypeScript migration and unified types
- ✅ TEST-01: Unit and route testing (Vitest)
- ✅ RANK-01: Kid Score ranking engine (TS port)
- ✅ DATA-04: Enriched data model (Kid Score, ratings, types)
- ✅ PIPE-01: GitHub Actions discovery pipeline
- ✅ SEO-04: Advanced SEO (Sitemaps index, SSR/ISR optimization)
- ⏸️ REV-01: Venue claim and Stripe sponsorship flow (deferred)

### Decisions
- **2026-04-24**: Merging validation and discovery into a single nightly cron job (D-07.5-02)
- **2026-04-24**: Switching OSM integration to native `fetch` to resolve specific Header/User-Agent requirements of Overpass API (D-07.5-03)
- **2026-04-24**: Adopting Yelp Fusion as the primary discovery source over Google Places to maintain zero-cost operations (D-07.5-01)
- **2026-05-15**: Adopting GitHub Actions for discovery orchestration to reduce VPS cost (D-07-01)
- **2026-05-15**: Porting `_calculate_kid_score` from Python prototype for ranking engine (D-07-02)
- **2026-05-15**: Upgrading to Next.js 16 and React 19 for improved performance and features (D-07-03)

### Pending Tasks
- [x] Initialize Phase 08.0 (Framework Modernization & Polish)
- [x] Upgrade Frontend & Backend Frameworks (Next.js, Node, React)
- [x] Setup CI/CD Pipeline
- [ ] Initialize Phase 09.0 (Revenue Loop)
- [ ] Monitor system stability and performance metrics
- [ ] Validate Kid Score ranking effectiveness

### Blockers
- None

---

## Project Context

### Tech Stack (Latest)
- **Frontend**: Next.js 15 (React 19), TailwindCSS 4, MapLibre GL JS 5
- **Backend**: Node.js 22, Express 5, BullMQ, Pino Logging
- **Data/AI**: PostgreSQL 15 + PostGIS, Redis 7, Brave Search API, Yelp Fusion API
- **Infrastructure**: Docker Compose on ARM VPS, GitHub Actions (Cron)

### Key Constraints
- Zero-cost discovery runs via GitHub Actions
- Mobile-first, high-performance SEO pages
- Timing-safe admin authentication for ingestion
- Zero-cost operation reliance for 3rd party APIs (Yelp, Brave, OpenRouter free tiers)
- Focus Area: Greater London (Bounding Box: 51.2, -0.5, 51.7, 0.3)

---

## Environment Variables Required

### Database
- `DB_PASSWORD`: PostgreSQL database password

### AI & External Services
- `OPENROUTER_API_KEY`: OpenRouter API key for LLM parsing
- `BRAVE_API_KEY`: Brave Search API key for fallback
- `YELP_API_KEY`: Yelp Fusion API key for venue enrichment
- `YELP_CLIENT_ID`: Yelp Fusion Client ID
- `STRIPE_SECRET_KEY`: Stripe secret key for revenue flow
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret

### Security
- `ADMIN_KEY`: Existing admin key for manual actions
- `INGEST_SIGNING_SECRET`: HMAC-SHA256 secret for GitHub Actions triggers

---

## Next Steps
1. Monitor the performance of the unified discovery pipeline.
2. Initialize Phase 09.0 - Revenue Loop (Stripe integration & claiming).
