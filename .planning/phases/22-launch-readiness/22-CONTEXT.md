# Phase 22: Launch Readiness — Context

**Gathered:** 2026-07-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Package KidSpot London for public adoption by completing data sweeps (Google Places discovery, chain expansion, postcodes.io geocoding, image backfill), polishing the parent-facing frontend (mobile-first party cards, shortlist polish, PWA), integrating trust signals (FHRS on detail pages), and hardening API security (CORS, rate limiting). SSL/HTTPS deferred until domain is ready.

**Scope note:** ~60% of features listed in ROADMAP already exist from prior phases (shortlist hook, compare table, shared shortlist page, FHRS service, trust signals). This phase focuses on what's truly remaining, not rebuilding existing work.
</domain>

<decisions>
## Implementation Decisions

### Scope & What's Actually Left
- **D-01:** Existing features (shortlist hook, compare table, shared shortlist page, FHRS service, trust signals) are sufficient — polish rather than rebuild.
- **D-02:** Data Max track (D1-D4) included in scope alongside frontend and infra work.
- **D-03:** SSL/HTTPS deferred until domain is registered. No Caddy/Nginx setup now.

### Listing Card Redesign (F1)
- **D-04:** Mobile-first party focus — re-prioritize card layout for party decision-making. Keep existing data but optimize hierarchy (price, capacity, CTA more prominent). Not a full visual redesign.

### Shortlist & Compare (F2-F4)
- **D-05:** Polish existing shortlist page — no dedicated compare dashboard needed. Existing CompareTable component is sufficient.

### Progressive Web App (F5)
- **D-06:** Manual service worker + `next.config.js` headers (not next-pwa or Workbox).
- **D-07:** Cache both search results (network-first, fallback to cache) and venue detail pages (cache-first, update in background).
- **D-08:** Generate manifest.json and install prompt. App shell cached for offline access.

### Food Hygiene Rating Scheme (T1)
- **D-09:** Hybrid approach — batch background BullMQ job matching venues to FHRS API by name+postcode, plus on-demand lazy match when detail page is viewed.
- **D-10:** FHRS score (0-5) displayed on venue detail page only. Existing "Food hygiene rated" badge on cards is sufficient.

### Data Provenance (T2)
- **D-11:** Keep current trust signals only (FHRS, owner-verified, accessibility via `trust.ts`). No expansion to data source badges.

### Data Max Sequencing (D1-D4)
- **D-12:** Run independent sweeps in parallel where possible — Google Places discovery, chain expansion via Places, postcodes.io geocoding, and image enrichment should be concurrent.

### Production Infra (I1-I3)
- **D-13:** CORS configuration + Express rate limiting only. No fail2ban.
- **D-14:** SSL/HTTPS deferred until domain is registered (I1). CORS config needs production domain to bind to.

### Agent's Discretion
- **A-01:** Specific mobile card layout changes (vertical vs horizontal, exact info hierarchy) — agent chooses based on existing UI conventions and party-focus goals.
- **A-02:** Service worker implementation details (cache names, versioning, cleanup) — agent chooses based on standard PWA patterns.
- **A-03:** FHRS batch job scheduling frequency and matching threshold — agent chooses reasonable defaults.
- **A-04:** Rate limiting thresholds — agent chooses based on existing patterns.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements & Roadmap
- `.planning/ROADMAP.md` §292 — Phase 22 entry with requirements
- `.planning/STATE.md` — Project state, tech stack, completed phases

### Existing Frontend Components (use, don't rebuild)
- `frontend/src/components/venues/venue-card.tsx` — Existing card to redesign for mobile-first party focus
- `frontend/src/hooks/use-shortlist.ts` — Existing localStorage-backed shortlist hook
- `frontend/src/components/venues/compare-table.tsx` — Existing side-by-side compare component
- `frontend/src/app/shortlist/page.tsx` — Existing shared shortlist render page
- `frontend/src/components/venues/share-button.tsx` — Existing Web Share API share button
- `frontend/src/lib/trust.ts` — Existing trust/provenance signals (FHRS, owner-verified, accessibility)
- `frontend/src/lib/shortlist-link.ts` — Existing shortlist URL encode/decode utility

### Existing Backend Services
- `backend/src/services/fhrsService.ts` — Existing FHRS API integration (search, match, similarity scoring)
- `backend/src/services/googlePlacesService.ts` — Existing Google Places API client
- `backend/src/services/braveService.ts` — Existing Brave API image search client
- `backend/src/worker.ts` — BullMQ worker registry for repeatable enrichment jobs
- `backend/src/utils/rateLimiter.ts` — crawlDelay + rate limiting utility

### Prior Phase Contexts
- `.planning/phases/21-party-catalogue-maximisation/21-CONTEXT.md` — Data metrics baseline, two-loop strategy
- `.planning/phases/20-improvement-plan/20-CONTEXT.md` — Image caching, mobile UX patterns, Caddy plan
- `.planning/phases/18D-party-data-extraction-weeks-25-26/18D-CONTEXT.md` — Party data schema, enrichment patterns
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `use-shortlist.ts` — Full localStorage-backed shortlist hook ready for polish
- `CompareTable` component — Comparison view can be reused/referenced
- `trust.ts` — `trustSignals()` utility deriving verifiable badges from venue data
- `fhrsService.ts` — FHRS API client with name/postcode similarity matching
- `share-button.tsx` — Web Share API + clipboard fallback pattern
- `shortlist-link.ts` — URL encoding utilities for shortlist sharing

### Established Patterns
- COALESCE/NULLIF write-safe pattern across all enrichment layers
- BullMQ repeatable jobs registered in `worker.ts` `setupRepeatingJobs`
- TanStack Query for data fetching (React Query)
- skeleton loaders on cards (Phase 20 established pattern)
- Mobile tap targets min 44×44px per WCAG (Phase 20)
- Frontend: Next.js 15 App Router, React 19, TailwindCSS 4, MapLibre GL JS 5

### Integration Points
- `worker.ts` — Add FHRS batch matching as new repeatable BullMQ job
- `venue-card.tsx` — Target for mobile-first card redesign
- `frontend/src/app/page.tsx` — Main page for PWA manifest/install
- `page.tsx` routes — CORS and rate limiting configuration in API routes
</code_context>

<specifics>
## Specific Ideas

- PWA: manual service worker + next.config.js headers (not third-party plugins)
- FHRS: hybrid batch+lazy matching, scores on detail page only
- Data sweeps run in parallel, not sequenced
- No domain-dependent work (SSL/CORS) until domain is ready
</specifics>

<deferred>
## Deferred Ideas

- **SSL/HTTPS setup** — Deferred until domain is registered. Revisit as a follow-up before public launch.
- **fail2ban** — Not needed at current scale. Revisit if scraping abuse becomes an issue.
- **Data source provenance badges** (e.g., "Council Data", "Google Places") — Out of scope. Keep current trust signals only.
- **Full compare dashboard** — Polish existing shortlist page instead. Full dashboard would be a separate phase.
</deferred>

---

*Phase: 22-launch-readiness*
*Context gathered: 2026-07-08*
