# KidSpot London - Development Roadmap

## Project Vision
To become the default, zero-friction utility for parents in the UK to discover, evaluate, and share child-friendly spaces, starting with London.

## Tech Stack
- **Frontend**: Next.js 15 (React 19), TailwindCSS 4, MapLibre GL JS 5
- **Backend**: Node.js 22, Express 5, BullMQ (Task Queue), Pino Logging
- **Data/AI**: PostgreSQL 15 + PostGIS, Redis 7, Brave Search API, Yelp Fusion API
- **Infrastructure**: Docker Compose on ARM VPS, GitHub Actions

---

## Phase 1: Data Foundation (Weeks 1-2)
**Status**: Completed
- ✅ Provision VPS and setup Docker environment
- ✅ Configure PostgreSQL + PostGIS
- ✅ Bulk import initial London Datastore data

---

## Phase 2: Ingestion Engine (Weeks 3-4)
**Status**: Completed
- ✅ Setup BullMQ worker infrastructure
- ✅ Integrate OpenRouter for LLM data parsing
- ✅ Implement Overpass API (OSM) integration
- ✅ Build deduplication logic

---

## Phase 3: Backend API & Fallback (Weeks 5-6)
**Status**: Completed
- ✅ Create REST API with spatial search
- ✅ Implement Redis caching and rate limiting
- ✅ Integrate Brave Search fallback engine

---

## Phase 4: Frontend Core (Weeks 7-8)
**Status**: Completed
- ✅ Mobile-first UI with TailwindCSS
- ✅ Search with location detection and radius
- ✅ MapLibre GL JS integration with venue pins
- ✅ Distance sorting and detail modals

---

## Phase 5: SEO & Detail Pages (Weeks 9-10)
**Status**: Completed
- ✅ Programmatic slug generation
- ✅ Standalone venue detail pages
- ✅ Programmatic landing pages for SEO
- ✅ OpenGraph and Metadata optimization

---

## Phase 6: Polish & Launch (Weeks 11-12)
**Status**: Completed
- ✅ Performance profiling and PM2 management
- ✅ Plausible Analytics integration
- ✅ Production deployment and soft launch

---

## Phase 7: Improvement & Cleanup (Weeks 13-16)
**Status**: Completed
- ✅ Layered backend architecture & TypeScript migration
- ✅ Enriched data model (Kid Score, Ratings)
- ✅ GitHub Actions automated discovery pipeline
- ✅ Yelp Fusion API integration (Replacing Google Places)
- ✅ Combined OSM + Brave search fallback with Haversine sorting

---

## Phase 8: Framework Modernization (Weeks 17-18)
**Status**: Completed
- ✅ Upgrade to Node 22, Express 5, Next 15, React 19, Tailwind 4
- ✅ Established CI pipeline (Lint, Typecheck, Test)
- ✅ Product surface polish (Server Components)

---

## Phase 8.5: UX & Data Quality Verification (Weeks 19-21)
**Status**: **COMPLETED**
**Goal**: Ensure data accuracy and polish the user experience to prove traffic value before monetization.

**Requirements**:
- ✅ 08.5-01-PLAN.md — **Data Accuracy Check**: Opening hours, pricing, and reviews.
- ✅ 08.5-02-PLAN.md — **Review & Sentiment UX**: Yelp Review integration.
- ✅ 08.5-03-PLAN.md — **Accessibility & Mobile UX**: WCAG compliance and placeholder pages.
- ✅ 08.5-04-PLAN.md — **Traffic Proofing**: Outbound link tracking system.

---

## Phase 9: Sponsorship & Revenue (Weeks 22-24)
**Status**: **COMPLETED**
**Goal**: Implement the monetization engine once the product value and traffic are proven.

**Plans**:
- ✅ 09-01-PLAN.md — **Claim Your Listing**: Secure self-service flow for venue owners.
- ✅ 09-02-PLAN.md — **Stripe Integration**: Recurring sponsorship tiers (Gold/Silver/Bronze).
- ✅ 09-03-PLAN.md — **Admin Revenue Dashboard**: Metrics and audit logs.

---

## Phase 10: Sponsor Features & Engagement (Weeks 25-26)
**Status**: **COMPLETED**
**Goal**: Deliver premium value to sponsors and provide verified owners with performance data.

**Plans**:
- ✅ 10-01-PLAN.md — **Sponsor Dashboard**: Private analytics and detail management for verified owners.
- ✅ 10-02-PLAN.md — **Featured Ranking**: Boosted search visibility and premium UI components.

---

## Phase 11: Scale & Expansion (Weeks 27+)
**Status**: **ACTIVE**
**Goal**: Scale the platform across more UK cities and optimize search relevance with AI.

**Requirements**:
- **SCALE-01**: Multi-city data ingestion pipelines.
- **AI-SRCH-01**: AI-enhanced search relevance ranking.
- **UI-OPT-01**: Frontend performance optimization for large datasets.

---

## Requirements Index (New Additions)

### Phase 8.5: UX & Quality
- **UX-DATA-01**: Opening hours display and "Open Now" status.
- **UX-DATA-02**: Pricing and booking fee transparency.
- **UX-DATA-03**: Direct booking/contact access from detail pages.
- **UX-ACC-01**: WCAG 2.1 compliance check.
- **UX-TRAF-01**: Click-through tracking for external links.

---

## Last Updated
April 24, 2026
