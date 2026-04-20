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
**Status**: Completed
**Requirements**: [DATA-01, DATA-02, DATA-03, INFRA-01]

**Goal**: Provision infrastructure and establish the data foundation with initial venue imports.

**Plans**: 5 plans (3 completed, 2 gap closure)
- [x] 01-01-PLAN.md — Provision ARM VPS and setup Docker Compose environment
- [x] 01-02-PLAN.md — Configure PostgreSQL + PostGIS with venue schema
- [x] 01-03-PLAN.md — Bulk import London Datastore CSVs into database
- [x] 01-04-PLAN.md — Gap closure: Add worker service to docker-compose.yml
- [x] 01-05-PLAN.md — Gap closure: Fix London Datastore URLs and verify data import

---

## Phase 2: Ingestion Engine (Weeks 3-4)
**Status**: Completed
**Requirements**: [INGEST-01, INGEST-02, INGEST-03, AI-01]

**Goal**: Build intelligent data ingestion pipeline with LLM-powered parsing and OSM integration.

**Plans**:
- [x] 02-01-PLAN.md — Setup BullMQ workers and Redis queue infrastructure
- [x] 02-02-PLAN.md — Integrate OpenRouter API for intelligent HTML parsing
- [x] 02-03-PLAN.md — Implement Overpass API (OSM) data import script
- [x] 02-04-PLAN.md — Build deduplication logic with Levenshtein distance

---

## Phase 3: Backend API & Fallback (Weeks 5-6)
**Status**: Completed
**Requirements**: [API-01, API-02, API-03, FALLBACK-01, CACHE-01]

**Goal**: Build REST API with spatial queries, caching, and "never zero" fallback engine.

**Plans**:
- [x] 03-01-PLAN.md — Create Express API with PostGIS spatial search endpoint
- [x] 03-02-PLAN.md — Implement Redis caching layer for search results
- [x] 03-04-PLAN.md — Add rate limiting and security headers (Helmet.js)
- [x] 03-05-PLAN.md — Gap closure: Security hardening
- [x] 03-06-PLAN.md — Gap closure: Brave Search API fallback (FALLBACK-01)

---

## Phase 4: Frontend Core (Weeks 7-8)
**Status**: Completed
**Requirements**: [UI-01, UI-02, UI-03, MAP-01, STATE-01]

**Goal**: Build mobile-first UI with map integration and real-time search.

**Plans**:
- [x] 04-01-PLAN.md — Setup Next.js project with TailwindCSS and React Query
- [x] 04-02-PLAN.md — Create search bar with location detection and radius slider
- [x] 04-03-PLAN.md — Integrate MapLibre GL JS with dynamic venue pins
- [x] 04-04-PLAN.md — Build venue list view with distance sorting
- [x] 04-05-PLAN.md — Implement venue detail modal with map snippet

---

## Phase 5: SEO & Detail Pages (Weeks 9-10)
**Status**: Completed
**Requirements**: [SEO-01, SEO-02, SEO-03, ROUTING-01]

**Goal**: Implement programmatic SEO and dynamic routing for venue pages.

**Plans**:
- [x] 05-01-PLAN.md — Backend Slug Foundation & Migration
- [x] 05-02-PLAN.md — Venue Detail Standalone Pages
- [x] 05-03-PLAN.md — Programmatic Landing Pages
- [x] 05-04-PLAN.md — SEO, Sitemaps & Social Sharing

---

## Phase 6: Polish & Launch (Weeks 11-12)
**Status**: Completed
**Requirements**: [PERF-01, DEPLOY-01, MONITOR-01, UAT-01]

**Goal**: Optimize performance, deploy to production, and conduct UAT testing.

**Plans**:
- [x] 06-01-PLAN.md — Performance profiling and optimization
- [x] 06-02-PLAN.md — Setup PM2 process management
- [x] 06-03-PLAN.md — Configure Plausible Analytics for privacy-first telemetry
- [x] 06-04-PLAN.md — Conduct UAT testing with beta users
- [x] 06-05-PLAN.md — Soft launch and Brave Search verification

---

## Phase 7: The Improvement Phase (Weeks 13+)
**Status**: In Progress
**Requirements**: [FIX-01, FIX-02, FIX-03, SEC-01, PERF-02, ARCH-01, ARCH-02, TEST-01, RANK-01, DATA-04, PIPE-01, SEO-04, REV-01, UPGRADE-01]

**Goal**: Transition from soft-launch prototype to production-hardened platform with improved ranking, SEO, and revenue features.

**Plans**: 11 plans
- [ ] 07-01-PLAN.md — P0: Correctness & Critical Fixes
- [ ] 07-02-PLAN.md — P0: Security Hardening & Health Monitoring
- [ ] 07-03-PLAN.md — P0: Core API Client & Redis Refactor
- [ ] 07-04-PLAN.md — P1: Layered Backend Architecture & Shared Types
- [ ] 07-05-PLAN.md — P1: Quality Baseline (Testing & CI)
- [ ] 07-06-PLAN.md — P2: Data Model Enrichment & Scoring Engine
- [ ] 07-07-PLAN.md — P2: Search Optimization & Data Backfill
- [ ] 07-08-PLAN.md — P3: GitHub Actions Discovery Pipeline
- [ ] 07-09-PLAN.md — P4: Advanced SEO & SSR Optimization
- [ ] 07-10-PLAN.md — P4: Revenue Loop (Venue Claims & Stripe)
- [ ] 07-11-PLAN.md — P5: Framework Upgrades (Node 22, Next 16, React 19)

**Success Criteria**:
- Worker service stable without crash loops
- "Kid Score" ranking engine driving search results
- GitHub Actions successfully automating discovery
- 100% SEO coverage with valid JSON-LD
- Stripe claim flow operational
- App running on Node 22, Next 16, React 19, Tailwind 4

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

### Phase 7: Improvement
- **FIX-01**: Fix worker crash loop and service config
- **FIX-02**: Fix Brave search coordinate bug
- **FIX-03**: Fix Google Places API implementation (v1/FieldMask)
- **SEC-01**: Security hardening (HMAC, timing-safe, CSP)
- **PERF-02**: Redis-backed rate limiting and caching refactor
- **ARCH-01**: Layered backend refactor (Controllers/Services/Clients)
- **ARCH-02**: TypeScript migration and unified types
- **TEST-01**: Unit and route testing (Vitest)
- **RANK-01**: Kid Score ranking engine (TS port)
- **DATA-04**: Enriched data model (Kid Score, ratings, types)
- **PIPE-01**: GitHub Actions discovery pipeline
- **SEO-04**: Advanced SEO (Sitemaps index, SSR/ISR optimization)
- **REV-01**: Venue claim and Stripe sponsorship flow
- **UPGRADE-01**: Framework upgrades (Node 22, Next 16, React 19)

---

## Milestones

- **Milestone 1 (Week 2)**: Data Foundation Complete - Database running with initial venue data
- **Milestone 2 (Week 4)**: Ingestion Engine Complete - All data sources flowing into database
- **Milestone 3 (Week 6)**: API Complete - Search API with fallback engine operational
- **Milestone 4 (Week 8)**: Frontend Complete - Full UI with map integration working
- **Milestone 5 (Week 10)**: SEO Complete - Programmatic pages generating traffic
- **Milestone 6 (Week 12)**: Launch - Production deployment with initial users
- **Milestone 7 (Week 16)**: Improvement - Production-hardened with ranking and revenue

---

## Last Updated
May 15, 2026
