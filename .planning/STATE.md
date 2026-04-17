# KidSpot London - Project State

## Current Position
**Phase**: 05 - SEO & Detail Pages
**Wave**: 02 (planning)
**Status**: Wave 01 (Backend Slug Foundation) complete
**Last Updated**: April 17, 2026

## Completed Phases
- 01 - Data Foundation
- 02 - Continuous Discovery
- 03 - Agentic Search API
- 04 - Frontend Core
- 05 - Wave 01: Backend Slug Foundation

## Current Phase: 05 - SEO & Detail Pages

### Objective
Provision infrastructure and establish the data foundation with initial venue imports.

### Requirements
- DATA-01: Provision ARM VPS with Docker Compose
- DATA-02: Configure PostgreSQL + PostGIS with venue schema
- DATA-03: Bulk import London Datastore CSVs
- INFRA-01: Setup Docker Compose environment

### Decisions
- **2026-04-15**: GiGL open data withdrawn Oct 2025 - pivoted to Cultural Infrastructure Map 2019 for venue CSV data
- **2026-04-15**: Updated download-datastore.js with working URLs (Arts centres, Community centres, Sports participation)
- **2026-04-15**: All 3 CSV downloads now succeed with valid venue point location data

### Pending Tasks
- Create PLAN.md files for Phase 1
- Execute Phase 1 plans
- Verify Phase 1 completion

### Blockers
- **GiGL Data Withdrawal**: GiGL Spaces to Visit and Open Space Friends Group withdrawn Oct 2025 - resolved by using Cultural Infrastructure Map alternatives

### Notes
- Project is starting from scratch
- All infrastructure needs to be provisioned
- Initial data import from London Datastore CSVs
- ARM VPS optimization required
- DATA-03 (bulk import): Now uses Cultural Infrastructure Map venue CSVs (Arts centres, Community centres) instead of GiGL data

---

## Project Context

### Tech Stack
- **Frontend**: Next.js (React 18), TailwindCSS, MapLibre GL JS
- **Backend**: Node.js 20, Express, BullMQ (Task Queue), Cheerio/Playwright (Scraping)
- **Data/AI**: PostgreSQL 15 + PostGIS, Redis (Caching & Queues), OpenRouter (LLM Parsing), Brave Search API (Fallback)
- **Infrastructure**: Docker Compose on ARM VPS

### Key Constraints
- ARM-based VPS (requires arm64 Docker images)
- Mobile-first UI required
- Privacy-first analytics (Plausible)
- Rate limiting (60 req/min per IP)
- "Never zero" search results (fallback to Brave Search)

### Success Metrics
- Search Density Map: Which postcodes are searched most frequently
- Fallback Trigger Rate: Target < 15% after month 3
- Outbound Click-Through Rate (CTR): Measures actual utility

---

## Environment Variables Required

### Database
- `DB_PASSWORD`: PostgreSQL database password

### AI Services
- `OPENROUTER_API_KEY`: OpenRouter API key for LLM parsing
- `BRAVE_API_KEY`: Brave Search API key for fallback

### Infrastructure
- VPS provider credentials (to be determined)
- Domain configuration (kidspot.london)

---

## Next Steps
1. Create PLAN.md files for Phase 1
2. Execute Phase 1 plans
3. Verify Phase 1 completion
4. Move to Phase 2: Ingestion Engine
