# Phase 5: SEO & Detail Pages (Weeks 9-10) - Context

**Gathered:** 2026-04-15
**Status:** Discussion interrupted - resume with /gsd-discuss-phase 5

<domain>
## Phase Boundary
Implement programmatic SEO and dynamic routing for venue pages:
- Create `/venue/[slug]` dynamic pages for each venue
- Generate programmatic SEO landing pages for boroughs and venue types
- Add OpenGraph tags for social sharing
- Implement share-to-clipboard functionality
</domain>

<decisions>
## Implementation Decisions
[No decisions yet - discussion was interrupted]

### the agent's Discretion
- TBD after discussion
</decisions>

<canonical_refs>
## Canonical References
**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/04-frontend-core/04-05-SUMMARY.md` — Venue detail modal (already built in Phase 4)
- `.planning/phases/04-frontend-core/04-05-PLAN.md` — Plan for venue detail modal
- `.planning/ROADMAP.md` §Phase 5 — Canonical phase requirements

### Tech Stack References
- `frontend/src/app/layout.tsx` — Next.js metadata pattern (has generateMetadata)
- No external SEO library currently in use
</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `VenueDetailModal` component (04-frontend-core) — shows venue info, can reference for data structure
- Existing `fetchVenues` API client — reuse for venue detail pages
- MapLibre integration already in place

### Established Patterns
- Next.js `generateMetadata()` pattern already in use (layout.tsx has Metadata type)
- TailwindCSS for styling (consistent with existing codebase)
- React Query for data fetching

### Integration Points
- New `/venue/[slug]` route would go in `frontend/src/app/venue/[slug]/`
- Programmatic pages for `/areas/[borough]` and `/types/[venue-type]`
- Share functionality hooks into existing API client
</codebase_context>

<specifics>
## Specific Ideas
No specific requirements captured yet — discussion was interrupted.
</specifics>

<deferred>
## Deferred Ideas
None — discussion stayed within phase scope
</deferred>

---

*Phase: 05-seo-detail-pages-weeks-9-10*
*Context gathered: 2026-04-15*
*Discussion interrupted — resume with /gsd-discuss-phase 5*