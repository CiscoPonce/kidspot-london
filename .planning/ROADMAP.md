# KidSpot London - Development Roadmap

## Project Vision
To become the default, zero-friction utility for parents in the UK to discover, evaluate, and share child-friendly spaces, starting with London.

## Tech Stack
- **Frontend**: Next.js (React 18), TailwindCSS, MapLibre GL JS
- **Backend**: Node.js 20, Express, BullMQ (Task Queue), Cheerio/Playwright (Scraping)
- **Data/AI**: PostgreSQL 15 + PostGIS, Redis (Caching & Queues), OpenRouter (LLM Parsing), Brave Search API (Fallback)
- **Infrastructure**: Docker Compose on ARM VPS

---

## Phase 1: Data Foundation (Weeks 1-2)
**Status**: Planned
**Requirements**: [DATA-01, DATA-02, DATA-03, INFRA-01]

**Goal**: Provision infrastructure and establish the data foundation with initial venue imports.

**Plans**: 5 plans (3 completed, 2 gap closure)
- [x] 01-01-PLAN.md — Provision ARM VPS and setup Docker Compose environment
- [x] 01-02-PLAN.md — Configure PostgreSQL + PostGIS with venue schema
- [x] 01-03-PLAN.md — Bulk import London Datastore CSVs into database
- [ ] 01-04-PLAN.md — Gap closure: Add worker service to docker-compose.yml
- [ ] 01-05-PLAN.md — Gap closure: Fix London Datastore URLs and verify data import

**Success Criteria**:
- VPS is provisioned with Docker Compose running
- PostgreSQL + PostGIS extensions are active
- Venue table with spatial index is created
- Initial venue data from London Datastore is imported
- Spatial queries (ST_DWithin) work correctly

---

## Phase 2: Ingestion Engine (Weeks 3-4)
**Status**: Not Started
**Requirements**: [INGEST-01, INGEST-02, INGEST-03, AI-01]

**Goal**: Build intelligent data ingestion pipeline with LLM-powered parsing and OSM integration.

**Plans**:
- [ ] 02-01-PLAN.md — Setup BullMQ workers and Redis queue infrastructure
- [ ] 02-02-PLAN.md — Integrate OpenRouter API for intelligent HTML parsing
- [ ] 02-03-PLAN.md — Implement Overpass API (OSM) data import script
- [ ] 02-04-PLAN.md — Build deduplication logic with Levenshtein distance

**Success Criteria**:
- BullMQ workers process scraping jobs
- OpenRouter successfully extracts structured data from unstructured HTML
- OSM venue data is imported and geocoded
- Duplicate venues are detected and prevented
- All data sources converge into unified venue table

---

## Phase 3: Backend API & Fallback (Weeks 5-6)
**Status**: Not Started
**Requirements**: [API-01, API-02, API-03, FALLBACK-01, CACHE-01]

**Goal**: Build REST API with spatial queries, caching, and "never zero" fallback engine.

**Plans**:
- [ ] 03-01-PLAN.md — Create Express API with PostGIS spatial search endpoint
- [ ] 03-02-PLAN.md — Implement Redis caching layer for search results
- [ ] 03-03-PLAN.md — Integrate Brave Search API as fallback mechanism
- [ ] 03-04-PLAN.md — Add rate limiting and security headers (Helmet.js)

**Success Criteria**:
- `/api/search` endpoint returns venues within radius
- Results are cached in Redis for 1 hour
- Fallback to Brave Search when no local results exist
- Rate limiting prevents abuse (60 req/min per IP)
- Security headers are properly configured

---

## Phase 4: Frontend Core (Weeks 7-8)
**Status**: Not Started
**Requirements**: [UI-01, UI-02, UI-03, MAP-01, STATE-01]

**Goal**: Build mobile-first UI with map integration and real-time search.

**Plans**:
- [ ] 04-01-PLAN.md — Setup Next.js project with TailwindCSS and React Query
- [ ] 04-02-PLAN.md — Create search bar with location detection and radius slider
- [ ] 04-03-PLAN.md — Integrate MapLibre GL JS with dynamic venue pins
- [ ] 04-04-PLAN.md — Build venue list view with distance sorting
- [ ] 04-05-PLAN.md — Implement venue detail modal with map snippet

**Success Criteria**:
- Next.js app runs on mobile and desktop
- Search bar accepts postcode or "Use My Location"
- Radius slider adjusts search area (1-10 miles)
- Map displays venue pins with clustering
- List view shows venues sorted by distance
- Detail modal shows venue info with call/website buttons

---

## Phase 5: SEO & Detail Pages (Weeks 9-10)
**Status**: Not Started
**Requirements**: [SEO-01, SEO-02, SEO-03, ROUTING-01]

**Goal**: Implement programmatic SEO and dynamic routing for venue pages.

**Plans**:
- [ ] 05-01-PLAN.md — Create dynamic routing for /venue/[slug] pages
- [ ] 05-02-PLAN.md — Generate programmatic SEO landing pages
- [ ] 05-03-PLAN.md — Add OpenGraph tags for social sharing
- [ ] 05-04-PLAN.md — Implement share-to-clipboard functionality

**Success Criteria**:
- Each venue has a dedicated SEO-optimized page
- Programmatic pages capture long-tail search traffic
- OpenGraph tags display correctly on social media
- Share button copies unique URL to clipboard

---

## Phase 6: Polish & Launch (Weeks 11-12)
**Status**: Not Started
**Requirements**: [PERF-01, DEPLOY-01, MONITOR-01, UAT-01]

**Goal**: Optimize performance, deploy to production, and conduct UAT testing.

**Plans**:
- [ ] 06-01-PLAN.md — Performance profiling and optimization
- [ ] 06-02-PLAN.md — Setup PM2 process management
- [ ] 06-03-PLAN.md — Configure Plausible Analytics for privacy-first telemetry
- [ ] 06-04-PLAN.md — Conduct UAT testing with beta users
- [ ] 06-05-PLAN.md — Soft launch to select Reddit/Facebook groups

**Success Criteria**:
- Application loads under 2 seconds on mobile
- PM2 manages all processes with auto-restart
- Analytics track search density and fallback rate
- Beta users provide positive feedback
- Soft launch generates initial traffic and engagement

---

## Requirements Index

### Data Foundation
- **DATA-01**: Provision ARM VPS with Docker Compose
- **DATA-02**: Configure PostgreSQL + PostGIS with venue schema
- **DATA-03**: Bulk import London Datastore CSVs
- **INFRA-01**: Setup Docker Compose environment

### Ingestion Engine
- **INGEST-01**: Setup BullMQ workers and Redis queue
- **INGEST-02**: Integrate OpenRouter API for HTML parsing
- **INGEST-03**: Implement Overpass API (OSM) import
- **AI-01**: LLM-powered data extraction

### Backend API
- **API-01**: Create Express API with spatial search
- **API-02**: Implement Redis caching layer
- **API-03**: Add rate limiting and security
- **FALLBACK-01**: Integrate Brave Search API fallback
- **CACHE-01**: Cache search results for 1 hour

### Frontend Core
- **UI-01**: Setup Next.js with TailwindCSS
- **UI-02**: Create search bar with location detection
- **UI-03**: Build venue list view
- **MAP-01**: Integrate MapLibre GL JS
- **STATE-01**: Implement React Query for data fetching

### SEO & Detail Pages
- **SEO-01**: Create dynamic routing for venue pages
- **SEO-02**: Generate programmatic SEO landing pages
- **SEO-03**: Add OpenGraph tags
- **ROUTING-01**: Implement share functionality

### Polish & Launch
- **PERF-01**: Performance profiling and optimization
- **DEPLOY-01**: Setup PM2 process management
- **MONITOR-01**: Configure Plausible Analytics
- **UAT-01**: Conduct UAT testing

---

## Milestones

- **Milestone 1 (Week 2)**: Data Foundation Complete - Database running with initial venue data
- **Milestone 2 (Week 4)**: Ingestion Engine Complete - All data sources flowing into database
- **Milestone 3 (Week 6)**: API Complete - Search API with fallback engine operational
- **Milestone 4 (Week 8)**: Frontend Complete - Full UI with map integration working
- **Milestone 5 (Week 10)**: SEO Complete - Programmatic pages generating traffic
- **Milestone 6 (Week 12)**: Launch - Production deployment with initial users

---

## Last Updated
April 15, 2026
