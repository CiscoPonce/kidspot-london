# Phase 3: Agentic Search API & Sponsor System

## Overview

Phase 3 builds the REST API with agentic search (on-demand details) and sponsor result system. This phase implements spatial search with sponsor ranking, agentic search for full venue details, sponsor management API, Redis caching, and security features.

**Duration:** Weeks 5-6
**Status:** Planned
**Plans:** 5 plans across 5 waves

## Goals

1. **Express API** - Build REST API with spatial search endpoint and sponsor-aware result ranking
2. **Agentic Search** - Implement on-demand fetching of full venue details from multiple sources
3. **Sponsor System** - Build sponsor management API for tier assignment and priority management
4. **Caching** - Implement Redis caching layer for search results and venue details
5. **Security** - Add rate limiting and security headers (Helmet.js)

## Requirements Addressed

- **API-01**: Create Express API with spatial search
- **API-02**: Implement Redis caching layer
- **API-03**: Add rate limiting and security
- **SPONSOR-01**: Build sponsor management API
- **SPONSOR-02**: Implement sponsor ranking in search results
- **AGENT-01**: Agentic search for full venue details
- **CACHE-01**: Cache search results for 1 hour

## Architecture: Agentic Search + Sponsor System

**API Endpoints:**
- `/api/search/venues` - Search venues by location and radius with sponsor ranking
- `/api/search/venues/:id/details` - Get full venue details on-demand (agentic search)
- `/api/sponsors/stats` - Get sponsor statistics
- `/api/sponsors/venues` - Get sponsored venues
- `/api/sponsors/venues/:id` - Get venue sponsor details
- `/api/sponsors/venues/:id/tier` - Update sponsor tier (admin only)
- `/api/sponsors/venues/bulk/tier` - Bulk update sponsor tiers (admin only)
- `/api/sponsors/pricing` - Get sponsor pricing information

**Sponsor Tiers:**
- Bronze (£99/month): Top 10, subtle badge, basic analytics
- Silver (£199/month): Top 5, prominent badge, advanced analytics
- Gold (£499/month): Top 3, featured styling, premium analytics

**Sponsor Ranking:**
1. Sponsor tier (gold > silver > bronze > none)
2. Sponsor priority (within same tier)
3. Distance (within same tier and priority)

**Agentic Search:**
- Fetch full details from Google Places API
- Fetch full details from OSM API
- Return address, phone, website, reviews, photos, opening hours
- Cache results for 1 hour

**Caching Strategy:**
- Search results: 1 hour TTL
- Venue details: 1 hour TTL
- Sponsor statistics: 5 minutes TTL
- Sponsor pricing: 24 hours TTL

## Plans

### Wave 1: Express API

#### Plan 03-01: Create Express API with spatial search endpoint (sponsor-aware)

**Objective:** Build REST API that allows users to search for venues by location and radius, with results ranked by sponsor tier and distance.

**Files Created:**
- `backend/src/server.js` - Express server with all routes
- `backend/src/routes/search.js` - Search API routes with sponsor ranking

**Features:**
- Express server on port 4000
- Security middleware (Helmet.js, CORS, rate limiting)
- Body parsing (express.json, express.urlencoded)
- Health check endpoint (/health)
- Search endpoint with sponsor ranking
- Venue details endpoint (agentic search)
- 404 handler
- Error handler

**Security Considerations:**
- Rate limiting (60 req/min per IP)
- Security headers via Helmet.js
- CORS configuration
- Input validation
- Error handling

### Wave 2: Agentic Search

#### Plan 03-02: Implement agentic search for full venue details

**Objective:** Fetch full venue details on-demand from multiple sources (Google Places, OSM) rather than storing all details locally.

**Files Updated:**
- `backend/src/routes/search.js` - Agentic search functions

**Features:**
- fetchGooglePlaceDetails function
- fetchOSMDetails function
- /api/search/venues/:id/details endpoint
- Returns address, phone, website, reviews, photos, opening hours
- Handles API failures gracefully
- Respects API rate limits

**Data Sources:**
- Google Places API (for Google sources)
- OpenStreetMap (Overpass API) (for OSM sources)

### Wave 3: Sponsor System

#### Plan 03-03: Build sponsor management API (tier assignment, priority)

**Objective:** Create API endpoints for managing sponsor tiers, setting priorities, viewing statistics, and getting pricing information.

**Files Created:**
- `backend/src/routes/sponsors.js` - Sponsor management API routes

**Features:**
- /api/sponsors/stats - Get sponsor statistics
- /api/sponsors/venues - Get sponsored venues
- /api/sponsors/venues/:id - Get venue sponsor details
- /api/sponsors/venues/:id/tier - Update sponsor tier (admin only)
- /api/sponsors/venues/bulk/tier - Bulk update sponsor tiers (admin only)
- /api/sponsors/pricing - Get sponsor pricing information
- Admin protection (X-Admin-Key header)

**Sponsor Tiers:**
- Bronze (£99/month): Top 10, subtle badge, basic analytics
- Silver (£199/month): Top 5, prominent badge, advanced analytics
- Priority support
- Gold (£499/month): Top 3, featured styling, premium analytics
- Dedicated support, custom branding

### Wave 4: Caching

#### Plan 03-04: Implement Redis caching for search results and venue details

**Objective:** Cache search results and venue details in Redis to reduce database load and improve response times.

**Files Updated:**
- `backend/src/routes/search.js` - Search result caching
- `backend/src/routes/sponsors.js` - Sponsor statistics caching

**Features:**
- Search results caching (1 hour TTL)
- Venue details caching (1 hour TTL)
- Sponsor statistics caching (5 minutes TTL)
- Sponsor pricing caching (24 hours TTL)
- Structured cache keys
- Cache invalidation on updates
- Cache hit tracking

**Cache Keys:**
- `search:{lat}:{lon}:{radius}:{type}` - Search results
- `venue:{id}:details` - Venue details
- `sponsors:stats` - Sponsor statistics
- `sponsors:pricing` - Sponsor pricing

### Wave 5: Security

#### Plan 03-05: Add rate limiting and security headers (Helmet.js)

**Objective:** Protect API endpoints from abuse and ensure secure communication with rate limiting, security headers, CORS configuration, and proper error handling.

**Files Updated:**
- `backend/src/server.js` - Security middleware

**Features:**
- Rate limiting (60 req/min per IP)
- Security headers via Helmet.js
- CORS configuration
- Input validation
- Error handling
- Generic error messages

**Security Headers:**
- HSTS (Strict-Transport-Security)
- NoSniff (X-Content-Type-Options)
- X-Frame-Options
- Content-Security-Policy

## Success Criteria

- [ ] Express API is running on port 4000
- [ ] /api/search/venues endpoint is complete
- [ ] /api/search/venues/:id/details endpoint is complete
- [ ] Sponsor ranking works correctly (gold > silver > bronze > none)
- [ ] Results are ordered by tier then distance
- [ ] Agentic search fetches full details on-demand
- [ ] Sponsor management API is complete
- [ ] Admin endpoints are protected with X-Admin-Key header
- [ ] Search results are cached in Redis
- [ ] Venue details are cached in Redis
- [ ] Cache invalidation works correctly
- [ ] Rate limiting is configured (60 req/min per IP)
- [ ] Security headers are configured via Helmet.js
- [ ] CORS is configured for production domain
- [ ] Input validation is implemented
- [ ] Error handling prevents information leakage

## Dependencies

**External Services Required:**
- Google Places API key (for agentic search)
- Admin key (for sponsor management)
- Redis server (for caching)

**Phase Dependencies:**
- Phase 1: Data Foundation (database schema, discovery scripts)
- Phase 2: Continuous Discovery (cron agent, categorization)

## Next Steps

After completing Phase 3:
1. Verify all API endpoints work correctly
2. Test sponsor ranking with sample data
3. Test agentic search with real venues
4. Verify caching improves performance
5. Test rate limiting and security features
6. Proceed to Phase 4: Frontend Core

## Execution

Execute all plans in this phase:

```bash
/gsd-execute-phase 03
```

Or execute individual waves:

```bash
/gsd-execute-phase 03 --wave 1  # Express API
/gsd-execute-phase 03 --wave 2  # Agentic search
/gsd-execute-phase 03 --wave 3  # Sponsor system
/gsd-execute-phase 03 --wave 4  # Caching
/gsd-execute-phase 03 --wave 5  # Security
```

## Verification

After execution, verify phase completion:

```bash
/gsd-verify-phase 03
```

This will check:
- All plans completed successfully
- All must-have criteria met
- API endpoints work correctly
- Sponsor ranking works correctly
- Agentic search works correctly
- Caching improves performance
- Security features are configured
- No security vulnerabilities introduced
