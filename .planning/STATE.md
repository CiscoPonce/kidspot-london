# KidSpot London - Project State

## Current Position
**Phase**: 07 - Improvement
**Wave**: 01 (Planning)
**Status**: Transitioning to production-hardened platform
**Last Updated**: May 15, 2026

## Completed Phases
- 01 - Data Foundation
- 02 - Continuous Discovery
- 03 - Agentic Search API
- 04 - Frontend Core
- 05 - SEO & Detail Pages
- 06 - Polish & Launch

## Active Phase: 07 - Improvement
### Objective
Transition KidSpot London from a soft-launch prototype to a production-hardened platform with improved ranking, SEO, and revenue features.

### Requirements
- FIX-01: Fix worker crash loop and service config
- FIX-02: Fix Brave search coordinate bug
- FIX-03: Fix Google Places API implementation (v1/FieldMask)
- SEC-01: Security hardening (HMAC, timing-safe, CSP)
- PERF-02: Redis-backed rate limiting and caching refactor
- ARCH-01: Layered backend refactor (Controllers/Services/Clients)
- ARCH-02: TypeScript migration and unified types
- TEST-01: Unit and route testing (Vitest)
- RANK-01: Kid Score ranking engine (TS port)
- DATA-04: Enriched data model (Kid Score, ratings, types)
- PIPE-01: GitHub Actions discovery pipeline
- SEO-04: Advanced SEO (Sitemaps index, SSR/ISR optimization)
- REV-01: Venue claim and Stripe sponsorship flow
- UPGRADE-01: Framework upgrades (Node 22, Next 16, React 19)

### Decisions
- **2026-05-15**: Adopting GitHub Actions for discovery orchestration to reduce VPS cost (D-07-01)
- **2026-05-15**: Porting `_calculate_kid_score` from Python prototype for ranking engine (D-07-02)
- **2026-05-15**: Upgrading to Next.js 16 and React 19 for improved performance and features (D-07-03)
- **2026-05-15**: Migrating to Google Places API v1 with FieldMask for cost/latency optimization (D-07-04)

### Pending Tasks
- [ ] Execute Phase 07-01: Correctness & Critical Fixes
- [ ] Execute Phase 07-02: Security Hardening & Health Monitoring
- [ ] Execute Phase 07-03: Core API Client & Redis Refactor

### Blockers
- None

---

## Project Context

### Tech Stack (Targeting Upgrade)
- **Frontend**: Next.js 16 (React 19), TailwindCSS 4, MapLibre GL JS 5
- **Backend**: Node.js 22, Express 5, BullMQ, Pino Logging
- **Data/AI**: PostgreSQL 15 + PostGIS, Redis 7, Brave Search API, Google Places v1
- **Infrastructure**: Docker Compose on ARM VPS, GitHub Actions (Cron)

### Key Constraints
- Zero-cost discovery runs via GitHub Actions
- Mobile-first, high-performance SEO pages
- Timing-safe admin authentication for ingestion
- FieldMask required for Google Places v1 calls

---

## Environment Variables Required
...
### Database
- `DB_PASSWORD`: PostgreSQL database password

### AI & External Services
- `OPENROUTER_API_KEY`: OpenRouter API key for LLM parsing
- `BRAVE_API_KEY`: Brave Search API key for fallback
- `GOOGLE_PLACES_API_KEY`: Google Places API v1 key
- `STRIPE_SECRET_KEY`: Stripe secret key for revenue flow
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret

### Security
- `ADMIN_KEY`: Existing admin key for manual actions
- `INGEST_SIGNING_SECRET`: HMAC-SHA256 secret for GitHub Actions triggers

---

## Next Steps
1. Create PLAN.md files for Phase 7 (07-01 through 07-11)
2. Execute Phase 07-01-PLAN.md
