# Phase 11: Search Experience V2 — Context

**Created:** 2026-05-04
**Status:** Planning
**Reference:** `.planning/design-refs/v2-search/` (Stitch designs + brand-corrected HTML for mobile and desktop)

## Phase Boundary

This phase rebuilds the **Search experience** of KidSpot to match the new
Stitch designs. It is a **frontend-only** redesign — the database schema,
backend API, and ranking logic remain unchanged. Phase 11 is the visible
deliverable that lifts the soft-launched product into a confident, modern
"second version" worthy of paid acquisition.

Two reference designs (saved locally in `.planning/design-refs/v2-search/`):

- **Mobile Web** — Stitch screen `06fac876a3e54b93b158287cf1998ad3`
  (`02-mobile-search.html`, `02-mobile-search-screenshot.png`).
- **Desktop** — Stitch screen `bb989358d4c84d40b4aa8ba75f60666e`
  (`03-desktop-search.html`, `03-desktop-search-screenshot.png`).

### Core Objectives

1. **Adopt the Stitch visual language** for the search surface: yellow-on-cream
   palette, Space Grotesk type, soft ambient shadows, rounded-`16px` cards,
   pill chips, ambient floating actions.
2. **Reduce category surface area** to four clearly-positioned chips matching
   the Stitch design — **Soft Play (yellow) · Parks (green) · Museums (blue)
   · Party Rooms (peach)** — and **remove cafés and leisure centres / pools**
   from every user-facing filter and label.
3. **Rebuild the venue card** with image-top (mobile) / image-left (desktop)
   layout, a heart save action, a "Safe-checked" trust pill on the image, and
   a clear `from £X / child` price derived from the existing
   `price_level` field.
4. **Recompose the desktop layout** as a 50/50 split with **map on the left**
   and a sticky filter bar + scrollable result list on the right (sponsor
   ranking is preserved).
5. **Add a mobile "View Map" floating pill** so the map is one tap away
   without sacrificing the dense card stack on small screens.
6. **Sharpen the brand mark** so the inline `KidSpot` logo always renders
   `Kid` in `#EFDF00` and `Spot` in `#222222` — the canonical wordmark in
   the Stitch references.

## Out of Scope (deliberately deferred)

- API contract changes (`price_from`, `safe_checked` boolean, vetted-staff
  flags) — for Phase 11 we derive what we can from existing fields and use
  conservative copy where data is missing.
- Booking / cart, owner-side dashboards (Phase 10 already shipped these).
- Multi-city expansion (Phase 12 candidate).
- Replacing the map library — we keep MapLibre GL.

## Success Criteria

- [ ] **Filter parity with Stitch**: only the four canonical chips +
      an "All" reset chip appear on home and search surfaces.
- [ ] **No more cafés / pools**: zero user-visible references to `cafe` or
      `leisure_centre` (filter UI, labels, copy, dropdowns, hero meta).
- [ ] **Card v2 live**: every result on home and `/venues-in/[borough]` /
      `/venues-by/[type]` renders with the new image-top / image-left card
      design.
- [ ] **Desktop split layout**: at `lg+` breakpoints the search results page
      is exactly **map left / list right**, both panels ~50% width, both
      independently scrollable.
- [ ] **Mobile FAB**: a floating "View Map" pill is visible above the bottom
      nav on `<lg` widths and scrolls the user to (or opens) the map view.
- [ ] **Lighthouse mobile** stays ≥ 85 on Performance, Accessibility, and
      Best Practices after the redesign.
- [ ] **Existing flows unchanged**: claim, billing, owner login/dashboard,
      sitemap, and SEO landing pages continue to function identically.

## Technical Strategy

- **Stack stays the same**: Next 16 App Router, React 19, Tailwind 3.4,
  TanStack React Query, MapLibre GL, Plausible, Material Symbols Outlined.
- **Tokens stay the same**: the existing `globals.css` already exposes the
  Stitch palette (`#fff9e6` surface, `#EFDF00` primary-container, etc.) — the
  redesign is component-level, not theme-level.
- **Backend untouched**: we map "Party Rooms" UI label to the existing
  `community_hall` venue type and surface price via `price_level` (1–4 →
  £, ££, £££, ££££). When `price_level` is `null` we render no price chip.
- **Trust signal**: the "Safe-checked" pill is shown when a venue is
  `is_active === true` AND has a populated `enriched_at` (i.e. the
  background discovery pipeline has refreshed it within retention). No new
  schema needed for Phase 11 — a follow-up phase can promote this to an
  explicit boolean.

## Implementation Waves

### Wave 1 — Cleanup & Filters (small, independently shippable)

Files touched:

- `frontend/src/lib/constants.ts`
- `frontend/src/components/layout/quick-filters.tsx`
- `frontend/src/components/layout/hero.tsx`
- `frontend/src/components/search/search-bar.tsx`
- `frontend/src/components/venues/venue-card.tsx` (icon meta only)
- `frontend/src/components/venues/venue-detail-content.tsx`
- `frontend/src/app/layout.tsx` (meta description copy)

Outcomes:

- `cafe` and `leisure_centre` removed from every user-facing list.
- `QuickFilters` becomes the multi-color v2 chip strip.
- The hero category dropdown shrinks to four options + "Any category".

### Wave 2 — Card V2 + Layout Recompose

Files touched:

- `frontend/src/components/venues/venue-card.tsx` (full rewrite)
- `frontend/src/components/venues/venue-list.tsx` (single-column stack on
  the search surface)
- `frontend/src/app/page.tsx` (50/50 desktop split, mobile "View Map" FAB)

Outcomes:

- New image-on-top / image-on-left card with heart, "Safe-checked",
  rating/borough row, and price block.
- Map sits on the **left** at `lg+`; results scroll on the right.
- Mobile gets a floating "View Map" pill above the bottom nav.

## Risk & Mitigation

| Risk | Mitigation |
|---|---|
| `image_url` is missing for many venues → ugly empty card | Fall back to a deterministic gradient block keyed on venue type (yellow / green / blue / peach matching the chip palette). |
| `price_level` is `null` for OSM/Brave fallback venues | Hide the price chip entirely instead of guessing. Show "Free" only for venues whose `type === 'park'` AND `price_level === 0`. |
| Existing `community_hall` results are broader than "Party Rooms" | Keep the label switch UI-only; backend filter still returns all `community_hall` venues. Acceptable for Phase 11. |
| Sponsor ranking visually disrupted by card redesign | Preserve the existing Gold/Silver/Bronze ribbons + tinted card backgrounds inside the new card layout. |

## Acceptance Demo Script

1. On a clean browser, open the production URL on a phone and a desktop
   simultaneously.
2. Confirm the homepage renders with the four-chip filter strip exactly
   as in `02-mobile-search-screenshot.png`.
3. Search for `SW1A 1AA`, radius 5 mi.
4. Mobile: confirm the vertical card stack, the heart toggle, the
   "Safe-checked" pill, and the floating "View Map" button.
5. Desktop: confirm the 50/50 split, the map left and the cards right,
   the same chip strip atop the results pane.
6. Toggle each chip in turn — counts update, cards filter, no `cafe`
   or `leisure_centre` appears anywhere.

## Key References

- `.planning/design-refs/v2-search/README.md` — design system + Stitch IDs.
- `02-mobile-search.html`, `03-desktop-search.html` — production-ready
  reference HTML pulled from Stitch.
- `STATE.md` — current project state (Phase 10 complete, Phase 11 active).
- `prposal.md` — original product framing.
