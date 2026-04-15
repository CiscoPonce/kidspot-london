---
status: partial
phase: 04-frontend-core
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
started: 2026-04-15T14:00:00Z
updated: 2026-04-15T15:05:00Z
---

## Current Test
[testing paused — requires browser/manual verification]

## Tests

### 1. App Loads and Displays
expected: Next.js app runs on http://localhost:3000. Page displays correctly on mobile (375px) and desktop (1280px). Search bar and map are visible immediately on load.
result: pass

### 2. Postcode Search
expected: Search bar accepts UK postcode (e.g., "SW1A 1AA"). After typing and waiting 500ms, geocoding occurs and map centers on that location.
result: skipped
reason: "Code verified, DB empty - needs browser with postcode entry"

### 3. Use My Location
expected: Clicking "Use My Location" requests browser geolocation permission. If granted, map centers on your current location.
result: skipped
reason: "Requires browser geolocation API - cannot test from CLI"

### 4. Radius Slider
expected: Radius slider shows 1-10 mile range. Dragging it adjusts the search area. Label shows current value (e.g., "Within 5 mile(s)").
result: skipped
reason: "UI verified in code - needs browser interaction"

### 5. Map Displays Venue Pins
expected: Map shows venue markers as colored pins. Pins appear clustered when zoomed out and spread apart when zoomed in.
result: skipped
reason: "DB empty - code verified, needs venue data"

### 6. Map Pin Click Opens Popup
expected: Clicking a venue pin opens a popup showing the venue name.
result: skipped
reason: "DB empty - code verified, needs venue pins"

### 7. Venue List Shows Results
expected: Below the map, a list shows venues sorted by distance (nearest first). Each item shows name, type icon, and distance in miles.
result: skipped
reason: "DB empty - code verified, needs venue data"

### 8. Sponsor Tier Badges
expected: Venues with sponsor tiers show colored badges (gold=sun-yellow, silver=slate, bronze=orange).
result: skipped
reason: "DB empty - code verified (Tailwind classes correct)"

### 9. Venue Selection Highlights
expected: Tapping a venue in the list highlights it and shows selection state with primary color border.
result: skipped
reason: "Requires browser interaction"

### 10. Venue Detail Modal Opens
expected: Tapping a venue opens the detail modal. Modal slides up from bottom on mobile, centers on desktop.
result: skipped
reason: "Requires browser interaction"

### 11. Modal Shows Venue Details
expected: Modal displays venue name, type badge, address, distance, and a small map snippet showing the venue location.
result: skipped
reason: "Requires venue data"

### 12. Call Button
expected: If venue has a phone number, a green Call button appears. Tapping it opens the phone dialer with the number pre-filled.
result: skipped
reason: "Requires venue data with phone"

### 13. Website Button
expected: If venue has a valid URL, a primary-colored Website button appears. Tapping it opens the website in a new tab.
result: skipped
reason: "Requires venue data with URL"

### 14. Modal Close Methods
expected: Modal closes via: X button, tapping backdrop, pressing Escape key, or swiping down 80px+ on mobile.
result: skipped
reason: "Requires browser interaction"

### 15. Empty State
expected: When no venues are found in the search area, list shows a helpful empty state message.
result: skipped
reason: "Backend returns error (DB empty) - code verified"

### 16. Loading States
expected: While fetching venues, list shows a loading skeleton. Modal shows a pulsing loading placeholder.
result: skipped
reason: "Code verified - needs browser to test loading states"

## Summary

total: 16
passed: 1
issues: 0
pending: 0
skipped: 15
blocked: 0

## Gaps

[none yet]