---
phase: 04-frontend-core
plan: 02
subsystem: frontend
tags: [search, geolocation, postcode, location-detection, mobile-first]
dependency_graph:
  requires:
    - 04-01
  provides:
    - Search bar with postcode input
    - "Use My Location" button
    - Radius slider (1-10 miles)
    - use-location hook (geolocation + Photon geocoding)
    - use-search hook (React Context state management)
tech_stack:
  added:
    - lucide-react (icons)
  patterns:
    - Browser Geolocation API for location detection
    - Photon API (photon.komoot.io) for postcode geocoding
    - React Context for search state
    - Debounced input (500ms)
key_files:
  created:
    - frontend/src/hooks/use-location.ts
    - frontend/src/hooks/use-search.ts
    - frontend/src/components/search/radius-slider.tsx
    - frontend/src/components/search/location-button.tsx
    - frontend/src/components/search/search-bar.tsx
decisions:
  - decision: Use Photon API for geocoding
    rationale: Free, no API key required, good coverage for UK postcodes
  - decision: Debounce postcode input 500ms
    rationale: Reduce unnecessary API calls while maintaining responsiveness
  - decision: Radius range 1-10 miles with 0.5 step
    rationale: Fine-grained control for local searches, step allows half-mile increments
metrics:
  duration_seconds: 120
  completed: 2026-04-15T13:15:00Z
---

# Phase 04 Plan 02 Summary: Search Bar with Location Detection

## One-liner

Search bar with postcode input, "Use My Location" geolocation button, and radius slider (1-10 miles) using Photon API for geocoding.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create location hook | 2c3323b | use-location.ts |
| 2 | Create radius slider component | 7184708 | radius-slider.tsx |
| 3 | Create location button component | ca3ef21 | location-button.tsx |
| 4 | Create search bar and use-search hook | 16ed3cf | search-bar.tsx, use-search.ts |

## Must-Haves Verification

| Must-Have | Status |
|-----------|--------|
| Search bar accepts postcode text input | ✅ Implemented with debounce |
| "Use My Location" button requests geolocation permission | ✅ Uses navigator.geolocation |
| Radius slider adjusts search area from 1 to 10 miles | ✅ Range input with 0.5 step |
| Radius slider shows current value | ✅ Label displays "Within X mile(s)" |
| Search triggers on location change or radius change | ✅ onSearch callback |
| Geolocation API is used for browser location detection | ✅ useCurrentPosition hook |
| Postcode is geocoded via Photon API before search | ✅ geocodePostcode function |

## Key Files

### frontend/src/hooks/use-location.ts
- `useCurrentPosition()` - Hook for browser geolocation
- `geocodePostcode(postcode)` - Photon API geocoding
- Types: `CurrentPosition`, `GeocodeResult`, `PositionPermissionState`

### frontend/src/hooks/use-search.ts
- `SearchProvider` - React Context for search state
- `useSearch()` - Hook to access search state (lat, lon, radius, postcode)
- `setSearchLocation(lat, lon)` - Update location
- `setRadius(radius)` - Update radius

### frontend/src/components/search/
- `search-bar.tsx` - Combined component with postcode input, location button, radius slider
- `location-button.tsx` - "Use My Location" button with loading/success/error states
- `radius-slider.tsx` - Styled range input with track fill visualization

## Threat Surface

| Threat ID | Category | Disposition | Mitigation |
|-----------|----------|-------------|------------|
| T-04-02-01 | Information Disclosure | accept | User explicitly grants permission |
| T-04-02-02 | Denial of Service | accept | Free API with rate limits |
| T-04-02-03 | Spoofing | mitigate | Input validation via postcode regex |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] All 4 tasks completed
- [x] Each task committed individually
- [x] use-location.ts created with geolocation and Photon geocoding
- [x] radius-slider.tsx created with 1-10 mile range
- [x] location-button.tsx created with loading/error states
- [x] search-bar.tsx and use-search.ts created
- [x] SUMMARY.md created