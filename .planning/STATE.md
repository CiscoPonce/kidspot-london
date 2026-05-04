# KidSpot London - Project State

## Current Position
**Phase**: 11 - Scale & Expansion
**Wave**: Post-Launch Optimization
**Status**: 
- **Phase 10 Complete**: Premium sponsor features are fully operational, including the owner dashboard, impression tracking, and hourly ranking rotation.
- **Commercial Loop Closed**: System handles everything from discovery -> claim -> subscription -> visibility -> analytics.
- **Codebase Solid**: Full TypeScript coverage, automated CI/CD, and robust Docker environment.
- **Next Goal**: Scale the platform across more UK cities and optimize search relevance with AI.
**Last Updated**: May 2, 2026

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

## Active Phase: 11 - Scale & Expansion
### Objective
Scale the platform across more UK cities and optimize search relevance with AI.

### Accomplishments (May 2, 2026)
- ✅ **Sponsor Dashboard Live**: Owners can log in via OTP to view real-time clicks and views.
- ✅ **Impression Tracking**: New `venue_views` infrastructure implemented and active.
- ✅ **Premium Ranking**: Hourly rotation for Gold/Silver/Bronze sponsors implemented in PostgreSQL.
- ✅ **Discovery ESM Fix**: Resolved silent failures in background ingestion scripts.

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
