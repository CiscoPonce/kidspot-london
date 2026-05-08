# KidSpot London - Project State

## Current Position
**Phase**: 12 - Party Portal Reliability
**Wave**: 1 - Guardrails
**Status**: 
- **Phase 11 Complete**: Search Experience V2 live with multi-color chips and image-rich cards.
- **Guardrails Live**: Phase 12-01 completed; database protects manual seeds and editor-locked venues from being overwritten by batch jobs.
- **Audit Ready**: Provenance tracking active for all critical venue changes.
**Last Updated**: May 8, 2026

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

## Active Phase: 12 - Party Portal Reliability
### Objective
Implement multi-source data architecture with provenance tracking and enrichment guardrails to become the main London portal for kids' parties.

### Accomplishments (May 8, 2026)
- ✅ **Guardrails Schema**: `editor_locked` and `manual_source` columns added to venues.
- ✅ **Provenance Log**: Audit table and database trigger capturing all `type` and `features` changes.
- ✅ **Cron Protection**: `cron-agent.ts` skips locked/manual venues and logs conflicts.
- ✅ **Type Health**: Resolved project-wide TypeScript errors in controllers and middleware.

### Decisions
- **2026-05-02**: Moving to Phase 10 to focus on sponsor value delivery (D-10-01).
- **2026-05-02**: Decided to implement OTP-based owner login for simplicity and security (D-10-02).

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
1. Define implementation plans for Phase 11 - Scale & Expansion.
2. Research multi-city data sources for UK-wide scaling.
3. Audit AI search relevance ranking for current London data.
