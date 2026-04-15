---
phase: 04-frontend-core
plan: 05
subsystem: frontend
tags: [modal, map, venue-details, call-button, website-button, mobile-first]
dependency_graph:
  requires:
    - 04-03
    - 04-04
  provides:
    - Venue detail modal with call/website buttons
    - Small map snippet showing venue location
tech_stack:
  added:
    - react-dom (createPortal for modal)
  patterns:
    - React Portal for modal rendering
    - Mobile sheet-style modal (slides up from bottom)
    - Swipe-down gesture for mobile close
    - URL validation for website links (T-04-05-02)
    - Phone number validation for tel: links
key_files:
  created:
    - frontend/src/components/map/venue-map-snippet.tsx
    - frontend/src/components/modals/venue-detail-modal.tsx
  modified:
    - frontend/src/app/page.tsx
decisions:
  - decision: Mobile sheet modal slides up from bottom
    rationale: Native mobile feel, swipe-down to dismiss is intuitive
  - decision: Desktop modal centers with max-width
    rationale: Familiar modal pattern on larger screens
  - decision: Single Marker map snippet (non-interactive)
    rationale: Location context only, no confusion with main map
  - decision: URL validation before rendering website link
    rationale: STRIDE mitigation T-04-05-02 against spoofing
  - decision: Phone validation before rendering call button
    rationale: Prevent invalid tel: links
  - decision: Use React Portal for modal
    rationale: Render outside component tree, proper stacking context
  - decision: Body scroll lock when modal open
    rationale: Prevent background scroll on mobile
metrics:
  duration_seconds: 0
  completed: 2026-04-15T13:45:00Z
---

# Phase 04 Plan 05 Summary: Venue Detail Modal

## One-liner

Venue detail modal with map snippet, call button (tel:), and website button (opens in new tab), with mobile sheet-style presentation and swipe-to-close gesture.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create venue map snippet component | a225fc5 | venue-map-snippet.tsx |
| 2 | Create venue detail modal | a480dba | venue-detail-modal.tsx |
| 3 | Wire up modal with venue selection | 37effde | page.tsx |
| 4 | Human verification | user-approved | - |

## Must-Haves Verification

| Must-Have | Status |
|-----------|--------|
| Venue detail modal opens when venue is selected | ✅ Both list and map clicks open modal |
| Modal shows venue name, type, address, phone | ✅ VenueDetailModal shows all fields |
| Modal shows website button (opens in new tab) | ✅ `target=\"_blank\" rel=\"noopener noreferrer\"` |
| Modal shows call button (tel: link) | ✅ `href=\"tel:{phone}\"` with validation |
| Modal shows small map snippet with venue pin | ✅ VenueMapSnippet (150px, single marker) |
| Modal has close button and closes on backdrop tap | ✅ X button, backdrop click, Escape key |
| Modal shows loading state while fetching details | ✅ ModalLoadingSkeleton with pulse animation |
| Modal shows error state if details unavailable | ✅ ModalErrorState with retry button |

## Implementation Details

### VenueMapSnippet (venue-map-snippet.tsx)
- Props: `{ lat, lon, name, zoom? }` (zoom defaults to 15)
- CartoDB Positron style (same as main map)
- Single blue marker centered on venue location
- Non-interactive (no pan/zoom controls)
- Fixed height: 150px
- Accessible with `role=\"img\"` and `aria-label`

### VenueDetailModal (venue-detail-modal.tsx)
- Props: `{ venue, isOpen, onClose }`
- React Portal renders to `document.body`
- Mobile: sheet slides up from bottom, rounded top corners
- Desktop: centered modal with max-width (sm:max-w-md)
- Header: venue name, type badge, sponsor tier badge
- Body: map snippet, address/distance, call/website buttons
- Loading: skeleton with animated pulse
- Error: retry button (still shows map snippet)

### Action Buttons
- **Call button**: Green (`bg-green-600`), phone icon, `href=\"tel:{phone}\"`
- **Website button**: Primary (`bg-primary-600`), external link icon, `target=\"_blank\" rel=\"noopener noreferrer\"`
- Both use `isValidPhone()` and `isValidUrl()` validation

### Close Behaviors
- X button in header
- Click/tap backdrop
- Press Escape key
- Swipe down 80px+ on mobile (touch gesture)
- Body scroll lock when open

### Page Integration (page.tsx)
- `selectedVenue` state managed in HomePage
- `VenueList onVenueSelect` → sets selectedVenue
- `VenueMap onVenueSelect` → sets selectedVenue
- `VenueDetailModal onClose` → clears selectedVenue

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added URL validation function**
- **Found during:** Implementation review
- **Issue:** Website link had no validation against invalid URLs (STRIDE T-04-05-02)
- **Fix:** Added `isValidUrl()` helper that checks protocol and parses URL
- **Files modified:** frontend/src/components/modals/venue-detail-modal.tsx
- **Commit:** a480dba

**2. [Rule 2 - Missing] Added phone validation function**
- **Found during:** Implementation review
- **Issue:** Call button had no validation against invalid phone numbers
- **Fix:** Added `isValidPhone()` helper with regex for 7+ digit numbers
- **Files modified:** frontend/src/components/modals/venue-detail-modal.tsx
- **Commit:** a480dba

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| None | - | Website/phone links use validation; external sites are user-initiated |

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| None | - | - | All functionality wired to real data sources |

## Self-Check

- [x] All 4 tasks completed
- [x] Each task committed individually (a225fc5, a480dba, 37effde)
- [x] VenueMapSnippet component created with single marker
- [x] VenueDetailModal created with all required sections
- [x] Page.tsx wired up with state management
- [x] Call button uses tel: link with validation
- [x] Website button opens in new tab with rel=\"noopener\"
- [x] Loading and error states implemented
- [x] Mobile sheet-style modal with swipe-to-close
- [x] SUMMARY.md created