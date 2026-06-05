---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-06-05T22:00:00.000Z"
progress:
  total_phases: 22
  completed_phases: 12
  total_plans: 56
  completed_plans: 52
  percent: 54
---

# KidSpot London - Project State

## Current Position

Phase: 18B (Contact Extraction Yield Optimization) — EXECUTING
Plan: 1 of 1
**Phase**: 17 - High-Velocity Enrichment
**Wave**: Complete
**Status**: 

- **Phase 12 Complete**: Party Portal Reliability live.
- **Phase 17 Complete**: High-velocity enrichment via Apify live.
- **Rich Data live**: Opening hours and images integrated into UI and API.
- **Asynchronous Webhooks live**: Background ingestion from Apify active.

**Last Updated**: June 5, 2026

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
- 18.0 - Autonomous Enrichment Engine & Code Quality
- 18.5 - Chain Enrichment & Categorization Polish
- 18.0-18.5 Data Validation (closure detection, Brave images, phone normalisation, contact-backfill worker, enriched_at timestamp)
- 18E - Deduplication & Search Ranking Hotfix

## Active Phase: 18B - Contact Extraction Yield Optimization

### Objective

Increase contact extraction yield of the direct-crawl pipeline by ~30% via browser-grade HTTP headers, OpenRouter LLM fallback extraction, and a BullMQ queue rate limiter.

## Completed Phases Detail

### Phase 18 Data Validation (Completed)

- ✅ **Closure Detection**: `is_active` flag set to FALSE when Apify reports permanent closure
- ✅ **Brave Image Search**: New `braveService.ts` with daily `enrich-brave-images` job
- ✅ **Phone Normalization**: `normalizeUkPhone()` utility in `backend/src/utils/phone.ts`
- ✅ **Contact Backfill**: `contact-backfill.ts` worker runs daily at 07:00
- ✅ **Enriched At**: `enriched_at = NOW()` set on every Apify update
- ✅ **Webhook**: `/admin/webhooks/apify` endpoint for Apify dataset notifications

### Phase 18.5 Chain Enrichment (Completed)

- ✅ **Categorization Overrides**: DB trigger for brands (Flip Out, Oxygen, etc.)
- ✅ **Chain Expansion**: Seeded missing Flip Out and Gravity locations

### Phase 18E Deduplication & Search Ranking Hotfix (Completed)

- ✅ **Deduplication Data Recovery**: Updated `dedup-sweep.ts` to merge types, parent facets, features, ratings, kid scores, and party details from deactivated duplicates to the keeper.
- ✅ **Database Repair (Migration 031)**: Restored data for 846 duplicate groups in the production database, restoring Atherton Leisure Centre and 44 other high-quality core venues.
- ✅ **Search Ranking Fix (Migration 032)**: Redefined `search_venues_by_radius` function to sort results by Distance first (closest first) instead of Kid Score first.
- ✅ **Container Redeployment & Validation**: Rebuilt and restarted API, web, and worker containers to compile the updated TS code, verifying that local searches correctly return Atherton and other core venues.

### Database Stats (June 2026)

- 16,844 total venues (14,676 active, 2,168 inactive)
- Image coverage: 303 (~2%)
- Email coverage: 2,380 (~14.1%)
- Phone coverage: 4,165 (~24.7%)
- Enriched venues: 16,767 (recently backfilled)

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

1. **Phase 18B yield optimisation (current focus):**
- Deploy browser-grade headers to all venue crawls
- Wire OpenRouter LLM fallback into `direct-crawl-enrichment.ts`
- Add BullMQ queue rate limiter
- Verify coverage lift via before/after SQL queries
2. Monitor Phase 18.5 and 18B pipeline runs for 2 weeks; confirm email/phone coverage rises from 8%/22% toward 11%/28%+
3. Re-run `coverage-eval.ts` and report yield delta to team.
4. Proceed to Phase 19 (Revenue Monetization V2) once contact coverage meets targets.
