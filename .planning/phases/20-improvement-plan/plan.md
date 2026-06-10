# Phase 20: Continued Project Improvement

This phase focuses on improving the finished KidSpot platform through robust data enrichment, pipeline efficiency, and UX modernization. Note: Revenue/Monetization tasks have been deliberately removed as per project goals.

## Completed Tasks

### Security & Infrastructure Base
- [x] **4.1 Security Hardening**: Locked Redis and Postgres ports to `127.0.0.1` and applied strong authentication (`PGPASSWORD` and `requirepass`).
- [x] **4.3 Automated Backups**: Created daily `pg_dump` cron script to back up the database automatically to `/home/ubuntu/backups`.
- [x] **4.4 Worker Healthchecks**: Replaced the Docker `process.exit(0)` dummy healthcheck with a real HTTP health probe on port 4001.
- [x] **4.5 Disk Space Optimization**: Ran aggressive `docker system prune --volumes`, reclaiming **45.46GB** of dead space.
- [x] **Fixed Database Persistency**: Corrected the `kartoza/postgis` volume mount path from `/var/lib/postgresql/data` to `/var/lib/postgresql`, ensuring data survives container restarts. 

### Data Coverage
- [x] **1.1 Google Places Enrichment Layer**: 
  - Added `backend/src/services/googlePlacesService.ts` to hit the Places API.
  - Added `enrich-google-places` BullMQ job running autonomously every 4 hours.
  - Widened the party data eligibility SQL query to process venues missing a website if they have a phone number or specific category.

---

## Remaining Tasks to Tackle

### Week 1: Data Coverage & Images
- [ ] **1.2 Google Street View image enrichment**
  - Add fallback image generation using Google Street View API for venues missing `photos`.
- [ ] **1.3 Council hall-hire data ingest script**
  - Parse PDFs/CSVs of local council community halls that lack modern web presences.

### Week 2: Pipeline & Ops Efficiency
- [ ] **2.1 Worker clustering & Concurrency limits**
  - Tune BullMQ concurrency for `discover` vs `enrich` jobs to prevent Postgres connection starvation.
- [ ] **2.2 Redis queue tuning**
  - Add exponential backoffs for rate-limited scrapers.
- [ ] **2.3 PostGIS optimization**
  - Cluster the `venues` table physically on disk using the `idx_venues_location` index for faster spatial reads.

### Week 3: UX Redesign & Performance
- [ ] **3.1 Mobile-first UX audit**
  - Improve tap targets, reduce padding on mobile, and ensure bottom-sheet maps work flawlessly.
- [ ] **3.2 Loading states & Optimistic UI**
  - Add skeleton loaders and smooth out React transitions when applying filters.
- [ ] **3.3 Dynamic map bounding**
  - Auto-fit the Leaflet/Mapbox bounds to the result set instead of static zoom levels.

### Week 4: Infrastructure Foundation (Pending)
- [ ] **4.2 HTTPS + domain setup**
  - Awaiting domain registration. Will use Caddy reverse proxy to automatically provision SSL certs for the API and Web containers.
