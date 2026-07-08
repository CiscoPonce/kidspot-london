---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-07-08T11:03:10.797Z"
progress:
  total_phases: 26
  completed_phases: 10
  total_plans: 58
  completed_plans: 51
  percent: 38
---

# KidSpot London - Project State

## Current Position

**Phase**: 21 — Party Catalogue Maximisation (**ACTIVE**)
**Plan:** `.planning/phases/21-party-catalogue-maximisation/21-PLAN.md`
**Quick ref:** `NEXT_ACTIONS.md`

- **June 11 Recovery**: Database rebuilt after Phase 20 volume incident
- **Core catalogue**: ~2,118 active party venues (scope-filtered search live)
- **Priority**: Google Places → contacts → party extraction → discovery sweep
- **Data gaps**: ~19% core websites, ~0% phones/images, ~3 party_capable

**Last Updated**: June 11, 2026

## Completed Phases

- 01–17 (Data Foundation through High-Velocity Enrichment)
- 18.0–18.5 Data Validation & Chain Enrichment
- 18E — Deduplication & Search Ranking Hotfix
- 20 (partial) — Security hardening, backups, Google Places/Street View jobs, PostGIS cluster, mobile UX

## Active Work: Phase 21 — Party Catalogue Maximisation

### Objectives

1. **Wave A:** Google Places full pass → direct crawl → party extraction → borough CSVs
2. **Wave B:** Google discovery sweep + chain expansion (no Apify) + postcodes.io geocoding
3. Re-classify and dedup after each bulk batch; hit success criteria in 21-CONTEXT.md
4. Phase 20 infra (HTTPS/domain) deferred until catalogue depth improves

### Database Stats (June 11, 2026 — post-rebuild)

- ~16,400 total venues ingested; ~2,130 active **core** (party catalogue)
- ~8,400 secondary (parks, excluded from default search)
- ~3,500 excluded/deactivated by cleanup-moderate.sql
- Contact/image/party coverage growing via enrichment pipeline

## Recovery Notes (do not repeat)

- Phase 20 `docker system prune --volumes` + volume mount change wiped production DB (Jun 9)
- Always verify backup dump size (expect ~1MB+) before infra changes
- Use `scripts/rebuild-catalog.sh` and `scripts/run-enrichment-pipeline.sh` for full rebuilds

## Environment Variables Required

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

1. **Phase 21 Wave A & B (Current Focus)**:
   - Run manual batches for Google Places enrichment and direct website crawls.
   - Run the party extraction script over all core venues with websites.
   - Implement the Google Places discovery sweep script and chain expansion fallback.
   - Perform postcode reverse geocoding via postcodes.io.
2. **Phase 22 Launch and Production Readiness**:
   - Redesign frontend listing cards for mobile, highlighting party capacity/pricing.
   - Create local shortlist persistence and comparison dashboard.
   - Integrate base64 URL sharing for shortlists.
   - Display Food Hygiene Rating Scheme (FHRS) scores.
   - Set up reverse proxy SSL, CORS lockouts, and Express rate limiting.
