# KidSpot London — Project Context

## What this is

KidSpot London is a **party-first** venue discovery platform for parents in Greater London. It helps find and compare places for children's birthday parties and family events — community halls, soft play, museums with party programmes — not a raw OpenStreetMap dump.

## Problem

Finding a venue for a child's birthday party in London is inefficient:

- **Data fragmentation** — scattered across council sites, business pages, parish sites
- **Data decay** — hours and pricing go stale; directories don't keep up
- **Zero-result frustration** — postcode searches often return nothing useful
- **No party context** — generic maps don't show capacity, pricing, or booking links

## Core value

A curated, geo-aware party catalogue that:

1. Aggregates OSM, council open data, Google Places, and direct website crawls
2. Enriches contacts, party pricing, capacity, and FHRS hygiene ratings autonomously
3. Surfaces **core party venues by default** (parks optional via `include_parks=true`)
4. Provides mobile-first search, shortlist, compare, and share — **no account required**

## Target users

| User | Need |
|------|------|
| **Time-poor parent** (primary) | Radius search, party price/capacity, Enquire/Call CTA |
| **Organiser** (secondary) | Borough/category filters, map view, shortlist compare |
| **Venue owner** (future) | Claim listing, sponsor tier, analytics dashboard |

## Technical architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 16, React 19, Tailwind 3.4, MapLibre GL, TanStack Query, PWA |
| **Backend** | Node.js 22, Express 5, TypeScript, BullMQ worker |
| **Database** | PostgreSQL 15 + PostGIS |
| **Cache/Queue** | Redis 7 |
| **Deploy** | Docker Compose on ARM VPS, Caddy reverse proxy |
| **CI/CD** | GitHub Actions (4 scheduled ingest pipelines) |
| **AI** | NVIDIA LLM fallback for contact + party extraction |

### Key technical decisions

- **`venue_scope` curation** — `core` / `secondary` / `excluded`; default search is core-only
- **Autonomous enrichment** — 42 BullMQ repeatable jobs; COALESCE-safe UPSERTs
- **Party data spine** — `party_capable`, `party_price_from`, `party_max_capacity`, `party_enquiry_url`
- **Trust signals** — FHRS hygiene ratings (batch + lazy match)
- **Zero-auth shortlist** — localStorage + shareable `/shortlist?v=` URLs
- **Rate limiting** — 60 req/min, Redis-backed; HMAC admin ingest

## Data sources

| Source | Role |
|--------|------|
| OpenStreetMap / Overpass | Discovery, coordinates, contacts |
| Google Places | Enrichment, discovery sweep, Street View |
| Direct website crawl | Contacts, party pages, Schema.org hours |
| Foursquare / Geoapify | Contact backfill |
| Brave / Apify | Images, closure detection |
| NVIDIA API | LLM extraction fallback |
| FHRS | Food hygiene trust signals |
| Borough CSVs / London Datastore | Council hall contacts |

## Completed phases (summary)

| Phase | Delivered |
|-------|-----------|
| 01–17 | Foundation, API, frontend, enrichment pipeline |
| 18–18E | Autonomous worker, party extraction, dedup fix, PWA |
| 20 | Security hardening, backups, Google Places layer |
| 22 | Launch readiness — PWA, FHRS, party cards, shortlist/compare/share |
| 23 | AI eval, OpenAPI, sitemap, analytics (DNS/HTTPS pending) |
| 24 | Frontend redesign + booking flow (Aug 2026) |

**Active:** Phase 21 — catalogue depth (discovery sweep, borough CSVs, party coverage).

## Success metrics

- **Listable core venues** — currently 1,765 / target 2,000+
- **Party-capable core** — currently 182 / target 500+
- **Outbound CTR** — Enquire/Call/Book clicks on party-capable venues
- **Shortlist usage** — create, compare, share events (Plausible)
- **Cron reliability** — GitHub ingest pipelines ≥ 95% success rate

## Privacy & security

- Plausible Analytics (privacy-first, no PII)
- CORS locked to production origins
- HMAC-signed admin ingest (GitHub Actions)
- Helmet security headers
- Daily encrypted DB backups

---
*Last updated: 2026-08-07*
