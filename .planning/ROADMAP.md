# KidSpot London - Development Roadmap

## Project Vision

To become the default, zero-friction utility for parents in the UK to discover, evaluate, and share child-friendly spaces, starting with London.

## Tech Stack

- **Frontend**: Next.js 16.2 (React 19), TailwindCSS 4, MapLibre GL JS 5
- **Backend**: Node.js 22, Express 5, BullMQ (Autonomous Enrichment Engine), Pino Logging
- **Data/AI**: PostgreSQL 15 + PostGIS, Redis 7, Brave Search API, Yelp Fusion API, Apify (Google Places)
- **Infrastructure**: Docker Compose on VPS, GitHub Actions

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

**Status**: Completed
**Goal**: Scale the platform across more UK cities and optimize search relevance with AI.

**Requirements**:

- **SCALE-01**: Multi-city data ingestion pipelines.
- **AI-SRCH-01**: AI-enhanced search relevance ranking.
- **UI-OPT-01**: Frontend performance optimization for large datasets.

---

## Phase 12: Party Portal Reliability (Weeks 28+)

**Status**: Completed

- ✅ Guardrails: Stop silent regressions with editor_locked and provenance tracking
- ✅ Multi-Facet Schema: Replace single type with parent_facets array and OR search
- ✅ FHRS Convergence: Curated business-type allowlist and address normalisation
- ✅ Borough CSV Pack: Automated CSV downloads with licence tracking
- ✅ OpenActive Pilot: Session-aware UX with feed enumeration
- ✅ Operator Integration: Partnership-first data ingestion with legal review

## Phase 13: UI/UX Modernization

**Status**: Completed

## Phase 14: Data Enrichment

**Status**: Completed

## Phase 15: Data Quality Enrichment

**Status**: Completed

## Phase 16: Accelerated Enrichment & Partnership

**Status**: Completed

## Phase 17: High-Velocity Enrichment

**Status**: **COMPLETED**
**Goal**: Implement a high-velocity data enrichment pipeline using Apify, including schema upgrades for rich data, asynchronous webhooks, and deep contact extraction.

**Plans**:

- ✅ 17-01-PLAN.md — **Apify Actor Integration**: Robust enrichment script using Google Places.
- ✅ 17-02-PLAN.md — **Pipeline Orchestration**: Integrate Apify as Layer 2 in the pipeline.
- ✅ 17-03-PLAN.md — **Scaling & Monitoring**: Increased batch size and admin dashboard tracking.
- ✅ 17-04-PLAN.md — **Rich Data Schema**: Database and API updates for opening hours and images.
- ✅ 17-05-PLAN.md — **Asynchronous Webhooks**: Webhook-based ingestion and deep website crawling.

---

## Phase 18: Autonomous Enrichment Engine & Code Quality

**Status**: **COMPLETED**
**Goal**: Transform the manual-trigger enrichment pipeline into a self-running background engine that continuously fills data gaps, and resolve critical code quality issues blocking monetization.

**Completed**:

- ✅ **Autonomous Enrichment Engine**: Rewrote BullMQ worker with 6 self-scheduling repeatable jobs (geocode every 4h, OSM contacts every 6h, web scraping every 8h, Apify daily, dedup weekly, discovery weekly)
- ✅ **VPS Code Recovery**: Committed Apify service and enrichment script files that existed only on the VPS as uncommitted changes
- ✅ **CORS Security**: Locked down CORS from permissive `origin: true` to production-only origins via `CORS_ORIGIN` env var
- ✅ **Overpass Elimination**: Removed live Overpass API calls from venue detail views (2-5s latency savings per request); OSM data served from pre-enriched DB only
- ✅ **Pipeline Expansion**: Expanded web scraper to cover 6 venue types (was 4) including community halls and parks
- ✅ **Batch Size Optimization**: Increased OSM contacts 100→200, web scraping 10→30
- ✅ **Smart Parks**: Auto-generated OSM map links for ~7,000 parks without websites
- ✅ **Dedup Safety**: Added NULLIF guards to prevent empty strings from overwriting valid data during merges
- ✅ **Shared Utilities**: Extracted duplicated `slugify()` into single shared module

**Production Stats** (at time of deployment):

- 14,238 active venues across 8 types
- Softplay/museum/library: 100% website coverage
- Leisure centres: 16.9% website coverage (3,308 unenriched — autonomous engine now targeting these)
- Parks: 54% of total inventory — now have OSM map link fallbacks

---

## Phase 18.5: Chain Enrichment & Categorization Polish (Weeks 23-24)

**Status**: **COMPLETED**
**Goal**: Correct systematic miscategorization of commercial indoor play centers and ensure 100% coverage of major child-friendly chains across Greater London.

**Completed**:

- ✅ **Categorization Overrides**: Database trigger to auto-map brands (Flip Out, etc.) to `softplay`.
- ✅ **Chain Expansion**: Targeted discovery script and seeding for major missing locations.
- ✅ **Coverage Audit**: 100% coverage for Flip Out London branches.

---

## Phase 18E: Deduplication & Search Ranking Hotfix (June 2026)

**Status**: **COMPLETED**
**Goal**: Address data loss issues where specific venue types (softplay, community halls) were silently deactivated during deduplication, and fix search ranking to prioritize proximity over Kid Score.

**Completed**:

- ✅ **Deduplication Data Recovery**: Updated `dedup-sweep.ts` to merge types, parent facets, features, ratings, kid scores, and party details from deactivated duplicates to the keeper.
- ✅ **Database Repair (Migration 031)**: Restored data for 846 duplicate groups in the production database, restoring Atherton Leisure Centre and 44 other high-quality core venues.
- ✅ **Search Ranking Fix (Migration 032)**: Redefined `search_venues_by_radius` function to sort results by **Distance** first (closest first) instead of Kid Score first.
- ✅ **Container Redeployment & Validation**: Rebuilt and restarted API, web, and worker containers to compile the updated TS code, verifying that local searches correctly return Atherton and other core venues.

---

---

## Phase 18B: Contact Extraction Yield Optimization (Weeks 23-24)

**Status**: **PLANNED**
**Goal**: Increase the yield of the direct-crawl contact extraction pipeline by ~30% through browser-grade HTTP headers and LLM fallback extraction, without adding new infrastructure.
**Requirements**:

- **CE-01**: Browser-grade header spoofing on all outbound venue crawls
- **CE-02**: LLM fallback extraction via OpenRouter when cheerio+regex returns nothing
- **CE-03**: BullMQ worker rate limiter to reduce upstream firewall blocks

---

## Phase 18D: Party Data Extraction (Weeks 25-26) — RUN FIRST (data spine for 18C)

**Status**: **PLANNED**
**Goal**: Give KidSpot the data its PRIMARY job (birthday parties / reunions) needs. The party-capable categories currently have **0% booking links, ~0% party pricing, and no party-capability flag at all** (only 33 of 14,676 venues mention "party"). Extend the Phase 18B engine (browser-grade crawl + NVIDIA LLM fallback) with a party-focused extraction pass. Backend-only; sequenced ahead of / parallel to 18C, which renders these fields.

**Addressable now** (~4,400 venues with a website): softplay (321 @ 100% web), leisure centres (~3,800 @ 92%), community halls with sites (~310 @ 20%).

**Requirements**:

- **DATA-PARTY-01**: Schema (`026_add_party_data.sql`) — `party_capable`, `party_price_from`, `party_price_unit`, `party_max_capacity`, `party_packages`, `party_enquiry_url`, `party_source`, `party_extracted_at` + partial index
- **DATA-PARTY-02**: LLM party extractor (`partyExtraction.ts`) — regex pre-pass + non-streaming NVIDIA fallback → strict validated JSON (hosts_parties, price_from, unit, capacity, packages, enquiry_url)
- **DATA-PARTY-03**: Wire into `direct-crawl-enrichment.ts` (COALESCE/NULLIF safe) + repeatable `enrich-party-data` BullMQ job with crawl delay
- **DATA-PARTY-04**: Populate enquiry/booking link; route website-less community halls (7% phone) to the 18B contact pipeline

**Success**: `party_capable` known for ≥80% of softplay & ≥60% of leisure/community-hall-with-sites; `party_price_from` for ≥40% of party-capable softplay; enquiry/booking link for ≥50% of party-capable venues; validated (no hallucinated values); backfill ETA tracked.

---

## Phase 18C: Party-First Frontend & Mobile-First Experience (Weeks 25-26)

**Status**: **PLANNED** (depends on Phase 18D)
**Goal**: Rebuild the frontend around KidSpot's PRIMARY job — helping a parent find and book a venue for a child's **birthday party or family reunion** — mobile-first and honest about its data. The hero flow (search → shortlist → **compare** → **share/enquire**) ships **locally with no auth**; server-backed persistence + accounts defer to Phase 19. Lean into the party-planning job general maps don't do, not the glossy 2% of softplay chains.

**Data reality driving this phase** (active venues): party-capable categories have 0% booking links / ~0% party price today (filled by 18D); parks (52%) are a *secondary* free-outdoor-party option rendered map/features-first. So cards must be **category-aware and party-first** with honest empty states, degrading to contact-to-enquire until 18D coverage lands.

**Requirements**:

- **FE-01**: Party-intent landing ("birthday/reunion") with party-capable categories foregrounded + one-tap geolocation search (removes dead age control)
- **FE-02**: Category-aware, party-first venue cards — party-capable → hosts-parties + £/child + capacity + age + Enquire/Call (Book only when booking_url exists); parks → Free + features + map; honest non-blank empty states; open-now parses both hours formats
- **FE-03**: Unified category filter (single source of truth, incl. party-capable facet) + `viewportFit:'cover'` safe-area fix; remove dead CSS
- **FE-04**: Persistent Party Shortlist (localStorage, API-ready)
- **FE-05**: Full-screen mobile map via List⇄Map segmented control; lazy MapLibre; bigger touch markers + recenter
- **FE-06**: Installable PWA (manifest + maskable icons + offline shell)
- **FE-07**: Personalization — kids' ages (→ party age-fit), favourite categories, recent searches (client-side)
- **FE-08**: LCP/CLS — `next/image`, preload hero asset, self-host/preload icon font (kill FOUT)
- **FE-09**: Virtualized/paginated venue list on mobile
- **FE-10**: WCAG 2.1 AA — modal focus trap, keyboard-reachable map results, chip contrast
- **FE-11**: Real trust signals — replace the fake `isSafeChecked()` (rating≥4) with verifiable FHRS hygiene (`fhrs_establishment_id`), accessibility, owner-verified, and data provenance; honest "not verified" states
- **FE-12** *(NEW)*: **Compare** shortlisted party venues side-by-side (£/child, capacity, age, distance, trust, per-column CTA); honest "—" where 18D data absent
- **FE-13** *(NEW)*: **Share a shortlist** via an encoded no-auth URL (Web Share API + copy-link); shared link rehydrates a read-only shortlist with save-locally

**Depends on Phase 18D** for party_capable / price / capacity / enquiry-link; cards & compare degrade honestly until coverage lands.

**Success (product, not vanity)**: party-enquiry/call/booking click-through on party-capable venues; non-zero shortlist creation, compare, and share usage (Plausible). Guardrails: Lighthouse mobile Perf ≥90 & A11y ≥95; LCP <2.5s; CLS <0.1; zero horizontal scroll at 320px; installable PWA.

---

## Phase 19: Revenue Monetization V2 (Planned)

**Status**: **PLANNED**
**Goal**: Enable venue owner self-service claiming and premium sponsorship tiers, leveraging the enriched contact data from Phase 18.

**Requirements**:

- **REV-01**: Claim Your Listing V2 — Owner verification using enriched email/phone data
- **REV-02**: Lead Generation Dashboard — Premium sponsorship analytics
- **REV-03**: Visual Content Pipeline — Automated image enrichment (Google Street View, Unsplash fallback)
- **REV-04**: Admin Enrichment Dashboard — Real-time data quality monitoring in admin UI

---

## Requirements Index (New Additions)

### Phase 8.5: UX & Quality

- **UX-DATA-01**: Opening hours display and "Open Now" status.
- **UX-DATA-02**: Pricing and booking fee transparency.
- **UX-DATA-03**: Direct booking/contact access from detail pages.
- **UX-ACC-01**: WCAG 2.1 compliance check.
- **UX-TRAF-01**: Click-through tracking for external links.

### Phase 18: Enrichment Engine

- **ENR-01**: Autonomous BullMQ worker with repeatable scheduled jobs.
- **ENR-02**: 5-layer enrichment pipeline (geocode → OSM → web scrape → Apify → smart parks).
- **ENR-03**: COALESCE/NULLIF data safety across all enrichment layers.
- **SEC-01**: Production CORS lockdown.
- **PERF-01**: Eliminate live Overpass calls from detail views.

---

## Phase 22: Parent-Facing Launch & Production Readiness (Planned)

**Status**: **PLANNED** (depends on Phase 21)
**Goal**: Package the platform for public adoption in London by completing key data sweeps, introducing custom sharing & comparison tools, integrating trust symbols, and completing SSL/API security hardening.

**Requirements**:

- **22-D1..D4**: Google Places discovery, chain expansion fallback, postcode.io geocoder, image enrichment.
- **22-F1..F5**: Listing card redo, persistent shortlists, side-by-side compare dashboard, base64 shortlist sharing, and installable PWA.
- **22-T1..T2**: Food Hygiene Rating Scheme (FHRS) score rendering and data provenance indicators.
- **22-I1..I3**: SSL proxy integration, API cors hardening, fail2ban setup.

**Plans:** 4/4 plans complete

**Plan list:**

- [x] 22-01-PLAN.md — Data Max: Google Places discovery, postcodes.io geocoding, chain expansion, orchestrator
- [x] 22-02-PLAN.md — PWA: Service worker, manifest, icons, install prompt, next.config.js headers
- [x] 22-03-PLAN.md — FHRS Integration: DB migration, batch matching, BullMQ job, API endpoint, detail page display
- [x] 22-04-PLAN.md — Frontend Polish: Mobile-first party card redesign, verify shortlist/compare/share/trust/infra

### Phase 23: Public Launch Infrastructure, Security Hardening & AI Eval Benchmark

**Goal:** Complete all public launch infrastructure requirements (SSL/HTTPS reverse proxy, domain mapping, production secrets, offsite backup sync), establish a formal AI evaluation benchmark and tracing pipeline for LLM extraction, and polish SEO, analytics, and image fallbacks.

**Requirements**:
- **23-INFRA-01**: **SSL Reverse Proxy & Domain Mapping** — Nginx/Caddy setup with Let's Encrypt certificates for `https://kidspot.london` and `https://api.kidspot.london` (required for mobile PWA service worker installation).
- **23-INFRA-02**: **Environment & CORS Hardening** — Lock down `CORS_ORIGIN=https://kidspot.london`, set `NEXT_PUBLIC_API_URL=https://api.kidspot.london/api`, and provision `GOOGLE_PLACES_API_KEY`.
- **23-INFRA-03**: **Offsite Backup Replication** — Enhance `scripts/backup.sh` to replicate nightly compressed PostGIS `.dump` files to cloud storage (S3 / Cloudflare R2 / GCS).
- **23-EVAL-01**: **Synthetic Ground-Truth AI Dataset** — Build a 50-item ground-truth test dataset (`evals.jsonl`) for party pricing, capacity, and contact extraction routines.
- **23-EVAL-02**: **Automated AI Eval Benchmark & Tracing** — Integrate an AI evaluation harness (Promptfoo) and observability tracing (Langfuse/LangSmith) to benchmark NVIDIA LLM extraction precision/recall.
- **23-SEO-01**: **SEO & Analytics Integration** — Generate programmatic `sitemap.xml` for all 33 London Borough landing pages, `robots.txt`, and integrate privacy-friendly analytics (Plausible/PostHog).
- **23-UX-01**: **Image Fallbacks & API Integration Tests** — Implement client-side retry logic for broken remote images and write Vitest integration test suites for spatial search endpoints.

**Depends on:** Phase 22  
**Plans:** 0/4 plans completed (4 plans created)

**Planned Breakdown:**
- [ ] 23-01-PLAN.md — **Infrastructure & SSL**: Caddy/Nginx reverse proxy, Let's Encrypt HTTPS, domain mapping, production CORS lockdown
- [ ] 23-02-PLAN.md — **Backup Replication & Disaster Recovery**: Offsite S3/R2 backup script, automated sync cron, environment key hardening
- [ ] 23-03-PLAN.md — **AI Evaluation Framework & Tracing**: `evals.jsonl` dataset, Promptfoo benchmark harness, Langfuse tracing integration
- [ ] 23-04-PLAN.md — **SEO, Analytics & Frontend Polish**: `sitemap.xml`, `robots.txt`, Plausible analytics, client image fallback retry logic


---

## Last Updated

July 28, 2026

