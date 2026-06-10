# Phase 20: Improvement Plan - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 20 covers remaining platform improvements across four weeks: image enrichment, council data ingestion, pipeline/ops efficiency, UX polish, and HTTPS infrastructure. Tasks already completed in this phase (security hardening, automated backups, worker healthchecks, disk cleanup, database persistency fix, and Google Places enrichment) are excluded. Downstream agents implement the remaining unchecked tasks: Street View image enrichment, council hall-hire ingestion, BullMQ concurrency tuning, Redis exponential backoff, PostGIS CLUSTER, mobile UX improvements (skeleton loaders, dynamic map bounds), and HTTPS setup.

Revenue/Monetization tasks are out of scope per project goals.
</domain>

<decisions>
## Implementation Decisions

### Image Enrichment (1.2 Street View)
- **D-01:** Images cached as static files on the VPS at a path served by the Next.js app.
- **D-02:** Generic venue-placeholder images by category (softplay, park, leisure centre, community hall) for venues where Street View returns no image.
- **D-03:** Google Street View attribution preserved per API terms (visible credit or attribution line).
- **D-04:** Monitor VPS disk after implementation — recent reclaim was 45.46 GB; alert if free space drops below ~10 GB.

### Council Hall-Hire Data Ingestion (1.3)
- **D-05:** Target all 33 London boroughs — no pilot.
- **D-06:** PDF parsing via NVIDIA LLM fallback (same `reasoning_content` accumulation pattern from Phase 18B CE-02); regex pre-pass first, LLM only when structured extraction fails.
- **D-07:** Ingested venues get a `hall_capable` or similar category flag; `source = 'council-data'`; schema migration needed.

### Pipeline & Ops Efficiency (2.x)
- **D-08:** Extend the existing `crawlDelay()` utility in `backend/src/utils/rateLimiter.ts` with a per-queue concurrency map configured in `backend/src/worker.ts` `setupRepeatingJobs`. Single source of truth; no per-job hard-coded limits.
- **D-09:** Redis queue tuning: add exponential backoff decorator to the same rate-limiter utility — consumed by `discover` jobs primarily.
- **D-10:** PostGIS CLUSTER on `venues` table using `idx_venues_location` is included in this phase. Execute during a low-traffic maintenance window; table will be briefly locked.

### UX & Map (3.x)
- **D-11:** Map auto-recenters only on new search submission, not on filter changes or shortlist actions.
- **D-12:** Implement skeleton loaders for venue cards and map pins while React Query fetches; smooth transitions on filter application.
- **D-13:** Improve mobile tap targets (min 44×44px per WCAG) and reduce horizontal padding; bottom-sheet maps should work without horizontal scroll at 320px viewport.

### Agent's Discretion
- **A-01:** Specific CLIUX layout methodology (skeleton shape, shadow depth) — agent chooses based on existing UI conventions from Phase 13/14.
- **A-02:** Council PDF parser structure (single unified parser vs per-borough adapters) — agent decides based on homogeneity found during research.
</decisions>

<canonical_refs>
## Canonical References

### Phase 20 Plan & Requirements
- `.planning/phases/20-improvement-plan/plan.md` — Source of truth for this phase's scope and remaining tasks
- `.planning/ROADMAP.md` — Phase 20 entry and overall roadmap

### Rate Limiting & LLM Fallback Patterns (must follow)
- `.planning/phases/18B-contact-extraction-yield-optimization-weeks-23-24/18B-CONTEXT.md` — `crawlDelay()` pattern, NVIDIA `reasoning_content` accumulation contract

### Enrichment Architecture
- `.planning/codebase/ARCHITECTURE.md` — Discovery layer scripts location, data flow
- `.planning/codebase/STACK.md` — BullMQ, Redis, Node/Express versions

### Key Source Files
- `backend/src/utils/rateLimiter.ts` — Target for concurrency map and exponential backoff extension
- `backend/src/worker.ts` — `setupRepeatingJobs` — target for concurrency config
- `backend/src/utils/phone.ts` — `normalizeUkPhone()` (existing utility pattern)
- `backend/src/services/googlePlacesService.ts` — Newly added Phase 20.1.1 image service
- `backend/src/services/braveService.ts` — Brave API client pattern
- `backend/db/schema.sql` — `search_venues_by_radius`, `idx_venues_location`, PostGIS patterns
- `frontend/src/app/page.tsx` — Frontend entry point for UX changes
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/utils/rateLimiter.ts` — `crawlDelay(baseMs)` utility; extend with `exponentialBackoff()` and per-queue concurrency map.
- `backend/src/services/googlePlacesService.ts` — Newly added in this phase (Phase 20.1.1); pattern for adding `googleStreetViewService.ts`.
- `backend/src/utils/phone.ts` — `normalizeUkPhone()` Uk phone regex/normalisation; reuse for any phone fields from council PDFs.
- `backend/src/config/env.ts` — Env var loading pattern; add `GOOGLE_STREET_VIEW_API_KEY`, `GOOGLE_PLACES_API_KEY` already present.
- `backend/db/migrations/` — Model for migration files (e.g., `026_add_party_data.sql` from Phase 18D); new schema migration for `hall_capable` flag follows same pattern.

### Established Patterns
- `COALESCE(NULLIF(...))` write-safe pattern across all enrichment layers (Phase 17 locked).
- `worker.ts setupRepeatingJobs` — all repeatable BullMQ jobs registered here with `cron` pattern.
- Frontend: Next.js 15 App Router, React 19, TanStack Query, MapLibre GL JS 5 (per STATE.md — not older STACK.md).
- Map bounds currently set as static zoom in MapLibre component — needs investigation to confirm implementation location.

### Integration Points
- `backend/src/worker.ts` — Add new `enrich-google-street-view` and `enrich-council-data` repeatable jobs.
- `backend/scripts/discovery/sources/googlePlacesService.ts` — Reference for HTTP fetch pattern (new API service).
- `backend/db/migrations/` — New migration for council schema + `idx_venues_location` CLUSTER.
- `frontend/src/app/page.tsx` and `frontend/src/components/` — UX audit targets (tap targets, skeleton loaders, map bounds).
- `docker-compose.yml` — Caddy proxy config for HTTPS Phase 4.2 task.
</code_context>

<specifics>
## Specific Ideas

- Image fallback set: one placeholder per venue category (softplay, leisure-centre, park, community-hall, museum, library, other).
- Council PDF parsing: Phase 18B NVIDIA LLM `reasoning_content` extraction pattern applies here — same OpenRouter/NVIDIA provider, same accumulated-token extraction logic.
- No specific reference PDF provided yet; researcher should locate borough-by-borough hall-hire PDFs.
- HTTPS: Caddy reverse proxy per plan; domain registration pending externally.
</specifics>

<deferred>
## Deferred Ideas

- No scope-creep items discussed. Discussion stayed within the four-week phase boundary as defined in `plan.md`.
</deferred>

---
*Phase: 20-improvement-plan*
*Context gathered: 2026-06-10*
