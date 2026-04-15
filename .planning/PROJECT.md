# KidSpot London - Project Context

## Project Summary
KidSpot London is a hyper-local, community-driven search engine for child-friendly venues in London. It solves the data fragmentation problem by combining public datasets, intelligent LLM-powered scraping, and real-time web search fallbacks.

## Problem Statement
Finding a venue for a child's birthday party in London is highly inefficient:
- **Data Fragmentation**: Information scattered across council websites, business pages, and parish sites
- **Data Decay**: Operating hours and pricing change frequently, manual directories become stale
- **Zero-Result Frustration**: Existing directories yield zero results for specific postcodes
- **Lack of Geo-Context**: Parents need distance, parking, and nearby amenities

## Solution
A unified, geo-aware directory that:
1. Aggregates public datasets (London Datastore), open-source mapping (OSM), and unstructured web data
2. Guarantees results with live API fallbacks
3. Provides mobile-first, lightning-fast UI without account requirements

## Target Users
- **Time-Poor Parent** (Primary): 28-45, working professional, 1-3 kids. Needs instant radius search, clear contact details, price indicators
- **The Organizer** (Secondary): PTA member, nursery manager. Needs advanced filtering, map view for logistics
- **The Venue Owner** (Tertiary/Future): Local church admin, soft-play manager. Needs simple listing management

## Core Features (V1)
1. **Smart Search Bar**: Powered by Photon/Nominatim with auto-suggest for London boroughs and postcodes
2. **Dynamic Map View**: Toggle between list and map view using MapLibre GL JS with pin clustering
3. **Never Zero Engine**: Fallback to external web search if no local results
4. **SEO-Optimized Venue Pages**: Programmatic SEO for long-tail search traffic

## Technical Architecture

### Infrastructure
- **Deployment**: ARM-based VPS with Docker Compose
- **Database**: PostgreSQL 15 + PostGIS for spatial queries
- **Cache/Queue**: Redis for caching and BullMQ task queues

### Backend
- **API**: Node.js 20 + Express
- **Scraping**: BullMQ workers with Cheerio/Playwright
- **AI**: OpenRouter API for LLM-powered HTML parsing
- **Fallback**: Brave Search API for zero-result scenarios

### Frontend
- **Framework**: Next.js (React 18)
- **Styling**: TailwindCSS
- **Maps**: MapLibre GL JS
- **State**: React Query for data fetching

### Key Technical Decisions
- **ARM Optimization**: Use arm64-specific Docker images
- **Spatial Indexing**: PostGIS GIST index for fast radius queries
- **Deduplication**: Levenshtein distance + 50m proximity check
- **Caching Strategy**: 1-hour search cache, 30-day geocoding cache
- **Rate Limiting**: 60 requests/minute per IP

## Data Sources
1. **London Datastore**: Public CSV datasets for leisure centres, community halls
2. **OpenStreetMap (OSM)**: Overpass API for venue data
3. **Web Scraping**: LLM-powered parsing of church hall and business websites
4. **Fallback**: Brave Search API for zero-result scenarios

## Development Roadmap (12 Weeks)
- **Weeks 1-2**: Data Foundation (VPS, Docker, PostgreSQL, initial imports)
- **Weeks 3-4**: Ingestion Engine (BullMQ, OpenRouter, OSM integration)
- **Weeks 5-6**: Backend API & Fallback (Express, caching, Brave Search)
- **Weeks 7-8**: Frontend Core (Next.js, maps, search UI)
- **Weeks 9-10**: SEO & Detail Pages (programmatic SEO, sharing)
- **Weeks 11-12**: Polish & Launch (performance, deployment, UAT)

## Go-To-Market Strategy
1. **Phase 1 (Months 1-3)**: Programmatic SEO with thousands of landing pages
2. **Phase 2 (Months 2-4)**: Community seeding in London Facebook groups
3. **Phase 3 (Months 3-6)**: Backlink outreach to parenting bloggers

## Success Metrics
- **Search Density Map**: Track most-searched postcodes
- **Fallback Trigger Rate**: Target < 15% after month 3
- **Outbound CTR**: Measure actual utility (clicks to call/website)

## Privacy & Analytics
- **Tool**: Plausible Analytics (privacy-first)
- **Tracking**: Search density, fallback rate, outbound CTR
- **No PII**: No personal data collection

## Security Considerations
- **Rate Limiting**: 60 req/min per IP to prevent scraping
- **CORS**: Strict binding to production domain
- **Headers**: Helmet.js for HSTS, NoSniff, X-Frame-Options
- **Input Validation**: All API inputs validated and sanitized

## Performance Targets
- **Load Time**: < 2 seconds on mobile
- **Search Latency**: < 500ms for cached results
- **Cache Hit Rate**: > 70% for common searches

## Known Constraints
- ARM VPS requires arm64 Docker images
- Mobile-first design required
- No account creation for core usage
- Free and accessible to all users
