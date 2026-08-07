# Technical Overview

> **This file is a quick reference.** For full detail see [README.md](README.md) and [.planning/STATE.md](.planning/STATE.md).

## Architecture

```
Caddy :80 → Next.js :3005 (frontend)
         → Express  :4000 (API)
              ↓
         PostgreSQL + PostGIS
         Redis (cache + BullMQ)
              ↓
         BullMQ Worker (42 scheduled enrichment jobs)
              ↓
         External APIs (Google Places, Brave, NVIDIA, FHRS, OSM, …)
```

## Stack (Aug 2026)

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, Tailwind 3.4, MapLibre GL |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL 15 + PostGIS |
| Queue/Cache | Redis 7, BullMQ |
| Deploy | Docker Compose (5 services) on ARM VPS |
| Proxy | Caddy (port 80; HTTPS pending DNS) |
| CI | GitHub Actions — 4 scheduled ingest crons |

## Docker services

| Service | Port | Role |
|---------|------|------|
| `web` | 3005 | Next.js frontend |
| `api` | 4000 | Express REST API |
| `worker` | 4001 (internal) | BullMQ enrichment engine |
| `postgres` | 127.0.0.1:5432 | PostGIS database |
| `redis` | 127.0.0.1:6379 | Cache + job queue |

## Key API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /health`, `/ready` | Public | Liveness / readiness |
| `GET /api/search/venues` | Public | Core catalogue search |
| `GET /api/search/venues/slug/:slug/details` | Public | Venue detail |
| `POST /api/admin/ingest/*` | HMAC | GitHub cron ingest |
| `GET /api/admin/enrichment-stats` | HMAC | Data quality metrics |
| `GET /api/sponsors/*` | Public/Admin | Sponsor tiers |

## Scheduled jobs

**GitHub Actions (UTC):**

| Workflow | Schedule |
|----------|----------|
| Data Enrichment | Hourly |
| Discovery (stale refresh) | Daily 02:00 |
| Party Discovery | Every 6h |
| Venue Expansion | 06:00 & 18:00 |

**VPS cron:** DB backup daily 04:00.

**BullMQ worker:** geocode, OSM contacts, direct crawl, party extraction, Google Places, FHRS batch, dedup sweep, and more — see README enrichment table.

## Production snapshot (7 Aug 2026)

- 16,751 total venues · **2,311 core** · **182 party-capable**
- All containers healthy · 51/51 backend tests pass

---
*Last updated: 2026-08-07*
