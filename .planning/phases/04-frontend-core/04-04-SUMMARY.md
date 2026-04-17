---
phase: 04-frontend-core
plan: 04
subsystem: frontend
tags:
  - venue-list
  - distance-sorting
  - sponsor-badges
  - react-query
dependency_graph:
  requires:
    - 04-01
  provides:
    - UI-03
  affects:
    - frontend/src/app/page.tsx
    - frontend/src/components/venues/*
tech_stack:
  added:
    - React Query useQuery
    - TailwindCSS responsive layouts
    - Lucide React icons
  patterns:
    - Distance-based sorting
    - Loading/empty/error states
    - Mobile-first touch targets
key_files:
  created:
    - frontend/src/components/venues/venue-card.tsx
    - frontend/src/components/venues/venue-list.tsx
    - frontend/src/components/venues/venue-list-item.tsx
  modified:
    - frontend/src/app/page.tsx
    - frontend/src/app/layout.tsx
decisions:
  - Used Venue type from lib/api.ts for consistency
  - Integrated with useSearch hook for real-time venue fetching
  - Sorted venues client-side after fetch
metrics:
  duration: ~5 minutes
  completed: "2026-04-15"
---

# Phase 04 Plan 04: Venue List View Summary

**One-liner:** Venue list components with distance sorting, sponsor badges, and mobile-friendly touch targets

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create venue card component | `060b25e` | venue-card.tsx |
| 2 | Create venue list component | `002ba10` | venue-list.tsx |
| 3 | Create list-item component | `818c4d0` | venue-list-item.tsx |
| 4 | Integrate list into main page | `9fbd707` | page.tsx, layout.tsx |

## What Was Built

**VenueCard** (`venue-card.tsx`):
- Props: `{ venue, distance, onSelect, isSelected }`
- Displays venue name, type icon, distance in miles
- Sponsor tier badges (gold=sun-yellow, silver=slate, bronze=orange)
- Type icons: Trees (park), Building (community_hall), Joystick (softplay), Dumbbell (sports_centre), MapPin (other)
- Selected state with primary color border and background
- Mobile-friendly 72px minimum height

**VenueList** (`venue-list.tsx`):
- Uses `useSearch` context for lat/lon/radius
- Fetches venues via `fetchVenues` API with `useQuery`
- Sorts venues by distance (nearest first)
- States: loading (skeleton), empty (helpful message), error (retry button), no-search (prompt)
- Scrollable container with max-height calculation

**VenueListItem** (`venue-list-item.tsx`):
- Compact 56px height for mobile bottom sheet
- Horizontal layout: icon | name+type | distance
- Highlight state for selected items

**Integration**:
- Added `SearchProvider` wrapper in `layout.tsx`
- Main page shows `SearchBar` followed by `VenueList`
- Selected venue highlights in list

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] Venue list displays below search bar
- [x] Venues are sorted by distance (nearest first)
- [x] Each venue shows name, type, distance
- [x] Sponsor venues show tier badge (gold, silver, bronze)
- [x] Tapping a venue card highlights it
- [x] List is scrollable with smooth scrolling
- [x] Empty state shows when no venues found
- [x] Loading state shows while fetching venues

## Self-Check

- [x] All task commits found: `060b25e`, `002ba10`, `818c4d0`, `9fbd707`
- [x] All files exist: venue-card.tsx, venue-list.tsx, venue-list-item.tsx, page.tsx, layout.tsx