# Phase 5: SEO & Detail Pages (Weeks 9-10) - Context

**Gathered:** 2026-04-17
**Status:** Decisions Finalized - Ready for Research/Planning

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

### 1. URL Structure & Slug Generation
- **Schema**: Add a `slug` column to the `venues` table with a unique index.
- **Generation Logic**: `slugify(name) + "-" + slugify(borough/area)`.
- **Collision Strategy**: If a slug exists, append a 4-character random hash (e.g., `starbucks-islington-8f2a`).
- **Backend API**: Add `GET /api/search/venues/slug/:slug/details` to resolve venue details via slug.

### 2. Metadata & Social Sharing
- **SEO**: Use Next.js `generateMetadata()` in `[slug]/page.tsx` for dynamic title/description.
- **JSON-LD**: Inject `LocalBusiness` structured data for search engine visibility.
- **OG Image**: Start with a static branded placeholder; dynamic images deferred to Phase 6.
- **Sharing UX**: Prioritize **Web Share API** (native mobile experience) with a "Copy to Clipboard" fallback with toast for desktop.

### 3. Programmatic Landing Pages
- **Routes**: `/venues-in/[borough]` and `/venues-by/[type]` (e.g., `/venues-in/hackney`, `/venues-by/soft-play`).
- **Data Source**: Use a hardcoded canonical list of the 32 London Boroughs + City of London for predictable URLs.
- **Content**: Dynamic lists of highest-rated or sponsored venues in the specified category/area.

### 4. Sitemaps & Indexing
- **Implementation**: Dynamic `sitemap.ts` in Next.js fetching all active venue slugs.
- **Priority**: Sponsored venues (Gold/Silver) to be prioritized in sitemap/indexing order where possible.

### the agent's Discretion
- Exact slugify library selection (e.g., `slugify` or custom regex).
- UI/UX of the share button placement and toast notification style.
- Exact JSON-LD fields (beyond `LocalBusiness` core fields).
</decisions>

<canonical_refs>
## Canonical References
**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/04-frontend-core/04-05-SUMMARY.md` — Venue detail modal (built in Phase 4)
- `.planning/phases/04-frontend-core/04-UAT.md` — UAT findings for frontend core
- `.planning/ROADMAP.md` §Phase 5 — Canonical phase requirements

### Tech Stack References
- `frontend/src/app/layout.tsx` — Next.js metadata pattern
- `backend/db/schema.sql` — Current venue schema (to be migrated)
- `backend/src/routes/search.js` — Current search and details API
</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `VenueDetailModal` component (04-frontend-core) — reuse UI components for the standalone venue page.
- Existing `fetchVenues` and `fetchVenueDetails` API clients in `frontend/src/lib/api.ts`.
- MapLibre integration for showing venue location on its own page.

### Established Patterns
- Next.js 14+ App Router patterns (Server Components for SEO).
- TailwindCSS for styling.
- React Query for client-side data fetching (if needed beyond initial SSR).

### Integration Points
- Backend: New migration for `slug` column and update to `insert_venue_if_not_duplicate` function.
- Frontend: `src/app/venue/[slug]/page.tsx` for standalone pages.
- Frontend: `src/app/venues-in/[borough]/page.tsx` for area pages.
</codebase_context>

<specifics>
## Specific Ideas
- Hardcoded list of London Boroughs: Camden, Greenwich, Hackney, Hammersmith and Fulham, Islington, Kensington and Chelsea, Lambeth, Lewisham, Southwark, Tower Hamlets, Wandsworth, Westminster, Barking and Dagenham, Barnet, Bexley, Brent, Bromley, Croydon, Ealing, Enfield, Haringey, Harrow, Havering, Hillingdon, Hounslow, Kingston upon Thames, Merton, Newham, Redbridge, Richmond upon Thames, Sutton, Waltham Forest, City of London.
</specifics>

<deferred>
## Deferred Ideas
- Dynamic OpenGraph image generation (Phase 6).
- User-generated reviews (Phase 7+).
- Advanced search filters (e.g., "with parking") on landing pages.
</deferred>

---

*Phase: 05-seo-detail-pages-weeks-9-10*
*Context gathered: 2026-04-17*
