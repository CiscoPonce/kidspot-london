---
phase: 22-launch-readiness
verified: 2026-07-08T12:00:00Z
status: passed
score: 21/21 must-haves verified
overrides_applied: 0
gaps: []
deferred: []
human_verification: []
---

# Phase 22: Launch Readiness Verification Report

**Phase Goal:** Package KidSpot London for public adoption by completing data sweeps (Google Places discovery, chain expansion, postcodes.io geocoding, image backfill), polishing the parent-facing frontend (mobile-first party cards, shortlist polish, PWA), integrating trust signals (FHRS on detail pages), and hardening API security (CORS, rate limiting). SSL/HTTPS deferred until domain is ready.

**Verified:** 2026-07-08T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

#### Plan 01 — Data Max (22-D1, 22-D2, 22-D3, 22-D4)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Google Places discovery sweep can find new venues not yet in the database | ✓ VERIFIED | `google-places-discovery.ts` exports `discoverVenuesViaGooglePlaces()` targeting under-represented boroughs (<100 venues) with category keywords, idempotent inserts via `ON CONFLICT (source, source_id)` |
| 2 | Chain expansion searches use Google Places Text Search API as primary method | ✓ VERIFIED | `chain-expansion.ts` imports `googlePlacesService.textSearch()` as primary (lines 56-76), falls back to Apify/dummy only when Google returns 0 results |
| 3 | Postcodes.io batch script enriches venues missing lat/lon or postcode | ✓ VERIFIED | `postcodesio-geocoding.ts` has forward pass (postcode→lat/lon, lines 133-181) and reverse pass (lat/lon→postcode, lines 183-239) with COALESCE write-safe updates |
| 4 | All four data sweeps can be triggered from a single orchestrator script | ✓ VERIFIED | `data-max-runner.ts` exports `runDataMaxSweeps()` running all 4 sweeps (Google Places discovery, chain expansion, postcodes.io geocoding, image enrichment) concurrently via `Promise.allSettled` |

#### Plan 02 — PWA (22-F5)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | The app can be installed as a PWA on Android/iOS/Desktop | ✓ VERIFIED | `manifest.ts` exports MetadataRoute.Manifest with name, short_name, theme_color (#006972), background_color (#fff9e6), icon refs. `layout.tsx` has `<link rel="manifest">`. `pwa-install-prompt.tsx` listens for `beforeinstallprompt`. Valid PNG icons at 192×192 and 512×512. |
| 6 | Search results load from network-first cache with offline fallback | ✓ VERIFIED | `sw.js` routes `/api/search/venues` to `networkFirst()` strategy (lines 124-128), with cache fallback and app shell fallback for navigation requests |
| 7 | Venue detail pages load from cache-first with background updates | ✓ VERIFIED | `sw.js` routes `/venue/*` to `staleWhileRevalidate()` (lines 130-134) — returns cached immediately, updates from network in background |
| 8 | The app shell (/, manifest, icons) is pre-cached on first visit | ✓ VERIFIED | `sw.js` install handler opens `STATIC_CACHE` and adds `['/', '/manifest.json', '/icon-192x192.png', '/icon-512x512.png']` (lines 19-25) |
| 9 | Service worker updates without manual intervention | ✓ VERIFIED | `sw.js` activate handler deletes stale caches (lines 30-44), calls `clients.claim()`. `next.config.js` serves `/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate` (lines 27-29). Versioned cache names enable clean upgrades. |

#### Plan 03 — FHRS Integration (22-T1)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 10 | FHRS scores display on venue detail pages for matched venues | ✓ VERIFIED | `venue-detail-content.tsx` renders Food Hygiene Rating card (lines 369-384) showing rating/5 with formatted date when `fhrs_establishment_id` and `fhrs_rating_value` exist |
| 11 | Batch BullMQ job can match venues to FHRS establishments by name+postcode | ✓ VERIFIED | `fhrs-batch-match.ts` exports `batchMatchFhrs()` querying venues without FHRS match, calling `fhrsService.matchFhrsToVenue()`, upserting results with COALESCE/NULLIF write-safe patterns |
| 12 | Lazy on-demand FHRS matching happens when a detail page is viewed | ✓ VERIFIED | `fhrsController.ts` exports `lazyMatchFhrs` at `GET /api/fhrs/match/:id` (route in `routes/fhrs.ts`, mounted at line 106 of `server.ts`). Calls `fhrsService.matchFhrsToVenue()` when venue has no existing match. |
| 13 | Unmatched venues display no FHRS information (no empty state errors) | ✓ VERIFIED | FHRS card conditionally renders: `{(venue as Venue).fhrs_establishment_id && (venue as Venue).fhrs_rating_value != null && (...)}` — no fallback for missing data |

#### Plan 04 — Frontend Polish (22-F1, 22-F2, 22-F3, 22-F4, 22-T2, 22-I2, 22-I3)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 14 | Mobile venue cards prioritize party decision-making info (price, capacity, CTA) | ✓ VERIFIED | `venue-card.tsx` renders party data section (lines 264-308) directly below venue name, before info row. Party price ("from £X/child"), capacity ("Up to Y"), and Enquire/Call button are grouped together |
| 15 | Party-capable venues show prominent Enquire/Call/Book button with price | ✓ VERIFIED | When `partyCapable && enquiryUrl` is true, card shows primary-colored Enquire button (line 288-297). When `partyCapable && phone`, shows Call button (lines 298-306). Price shown inline. |
| 16 | Existing shortlist hook (use-shortlist.ts) persists venues across page reloads | ✓ VERIFIED | `use-shortlist.ts` uses `useSyncExternalStore` + `StorageEvent` for cross-tab sync. localStorage-backed with versioned key `kidspot:shortlist:v1`. Exports `has()`, `toggle()`, `add()`, `remove()`, `clear()`. Imported in `venue-card.tsx` line 20. |
| 17 | Existing CompareTable renders side-by-side comparison with party data columns | ✓ VERIFIED | `compare-table.tsx` renders columns for Price (party_price_from/unit), Max capacity (party_max_capacity), plus Type, Area, Rating, Trust. Handles empty state (returns null for 0 venues, shows "—" for unknown data). Used in `/shortlist/page.tsx` line 88. |
| 18 | Existing ShareButton + shortlist-link.ts encode/decode shortlist URLs | ✓ VERIFIED | `shortlist-link.ts` has `encodeShortlist()` with MAX_ITEMS=30 guard and regex validation (`/^[A-Za-z0-9_-]+$/`), `decodeShortlist()`, `buildShortlistUrl()`. `share-button.tsx` uses Web Share API with clipboard/`sonner` toast fallback. |
| 19 | Existing trust.ts derives verifiable signals (FHRS, owner-verified, accessibility) | ✓ VERIFIED | `trust.ts` `trustSignals()` returns signals from real venue fields: `fhrs_establishment_id` → "Food hygiene rated", `claimed_at` → "Owner verified", `features` (wheelchair/accessible) → "Accessible". No heuristic-based fabricated signals. |
| 20 | CORS is configured with CORS_ORIGIN env var and production fallback | ✓ VERIFIED | `server.ts` lines 42-50: reads `CORS_ORIGIN` env var, splits by comma, production fallback `['https://kidspot.london', 'https://www.kidspot.london']`, credentials enabled, methods/headers whitelisted. Per D-14, awaits domain binding. |
| 21 | Rate limiting is Redis-backed at 60 req/min/IP on all /api/ routes | ✓ VERIFIED | `rateLimit.ts` exports `apiLimiter` using `express-rate-limit` with `rate-limit-redis` Redis store, 60 req/min/IP, standard headers, logging handler. Applied globally at `server.ts` line 53: `app.use('/api/', apiLimiter)`. |

**Score:** 21/21 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `backend/src/services/googlePlacesService.ts` | `textSearch()` method returning multiple results | ✓ VERIFIED | 161 lines. Has `textSearch()` and `GooglePlaceTextSearchResult` interface. Rate-limit/error handling matches existing `findPlace()` pattern. |
| `backend/scripts/discovery/sources/google-places-discovery.ts` | Discovery script with exports and CLI entry | ✓ VERIFIED | 243 lines. Exports `discoverVenuesViaGooglePlaces()`, `GooglePlacesDiscoveryResult`. Borough-targeted discovery with category keywords. Follows enrichment pattern. |
| `backend/scripts/discovery/sources/postcodesio-geocoding.ts` | Postcodes.io batch geocoding script | ✓ VERIFIED | 266 lines. Forward (postcode→lat/lon) and reverse (lat/lon→postcode) passes. COALESCE updates. CLI entry point. |
| `backend/scripts/discovery/chain-expansion.ts` | Google Places as primary, Apify fallback | ✓ VERIFIED | 215 lines. Uses `googlePlacesService.textSearch()` as primary search (lines 56-76), falls back to Apify/dummy. ON CONFLICT idempotent inserts. |
| `backend/scripts/discovery/data-max-runner.ts` | Orchestrator for all 4 sweeps | ✓ VERIFIED | 151 lines. Runs Google Places discovery, chain expansion, postcodes.io geocoding, and image enrichment concurrently via `Promise.allSettled`. Per-sweep error isolation. |
| `frontend/public/sw.js` | Manual service worker, ≥80 lines | ✓ VERIFIED | 163 lines. Versioned caches (CACHE, SEARCH_CACHE, DETAIL_CACHE, STATIC_CACHE). install/activate/fetch events. 3 caching strategies. |
| `frontend/src/app/manifest.ts` | Dynamic Web App Manifest | ✓ VERIFIED | 18 lines. Exports `manifest()` returning `MetadataRoute.Manifest`. name/short_name/theme_color/background_color/icons all correct. |
| `frontend/public/icon-192x192.png` | 192×192 valid PNG icon | ✓ VERIFIED | PNG image data, 192×192, 6271 bytes |
| `frontend/public/icon-512x512.png` | 512×512 valid PNG icon | ✓ VERIFIED | PNG image data, 512×512, 16711 bytes |
| `frontend/src/app/layout.tsx` | PWA wiring in layout | ✓ VERIFIED | 79 lines. Has `<link rel="manifest">`, SW registration script, iOS meta tags, `<PwaInstallPrompt />` component. |
| `frontend/next.config.js` | SW headers + security headers | ✓ VERIFIED | 45 lines. `async headers()` returns `/sw.js` config (no-cache, Service-Worker-Allowed) and global security headers (nosniff, DENY, referrer). |
| `frontend/src/components/layout/pwa-install-prompt.tsx` | Install prompt component | ✓ VERIFIED | 85 lines. 'use client' component with `beforeinstallprompt` listener, `handleInstall`/`handleDismiss`, bottom banner with Tailwind theme tokens. |
| `backend/db/migrations/038_add_fhrs_venue_rating_fields.sql` | DB migration for FHRS fields | ✓ VERIFIED | Adds `fhrs_rating_value TEXT`, `fhrs_rating_date TIMESTAMPTZ`, `fhrs_matched_at TIMESTAMPTZ` with IF NOT EXISTS guards. Partial index on unmatched venues. |
| `backend/scripts/discovery/sources/fhrs-batch-match.ts` | FHRS batch match script | ✓ VERIFIED | 130 lines. Exports `batchMatchFhrs()` and `FhrsBatchResult`. 90-day retry window. UPSERT into fhrs_establishments + UPDATE venues with COALESCE. |
| `backend/src/worker.ts` | BullMQ enrich-fhrs-batch job | ✓ VERIFIED | Registers daily 8am repeatable job (line 113-116). Case handler in `processJob()` (line 285-292). |
| `backend/src/controllers/fhrsController.ts` | Lazy FHRS matching controller | ✓ VERIFIED | 132 lines. Validates venue ID (positive integer), returns 400/404/500. Calls `matchFhrsToVenue()`, upserts + updates, returns FHRS data. |
| `backend/src/routes/fhrs.ts` | FHRS route | ✓ VERIFIED | 12 lines. `GET /match/:id` route. Follows pattern from `routes/search.ts`. |
| `backend/src/server.ts` | Route registration | ✓ VERIFIED | Imports `fhrsRoutes` (line 17), mounts `app.use('/api/fhrs', fhrsRoutes)` (line 106). |
| `frontend/src/lib/api.ts` | Venue type with FHRS fields | ✓ VERIFIED | Has `fhrs_rating_value?: string | null` and `fhrs_rating_date?: string | null` (line 33). |
| `frontend/src/components/venues/venue-detail-content.tsx` | FHRS score card on detail page | ✓ VERIFIED | Renders FHRS card (lines 369-384) with rating_value/5 and formatted date between description and opening hours. Conditional rendering. |
| `frontend/src/components/venues/venue-card.tsx` | Mobile-first party-focused card | ✓ VERIFIED | 375 lines. Party data (price, capacity, CTA) below venue name. Info row (rating, open state, distance) secondary. View button at bottom. All badges preserved. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `google-places-discovery.ts` | `googlePlacesService` | `googlePlacesService.textSearch()` | ✓ WIRED | Line 120: `googlePlacesService.textSearch(searchQuery, {...})` |
| `postcodesio-geocoding.ts` | `postcodes.io API` | HTTP POST | ✓ WIRED | Lines 53-68: `fetch(\`https://api.postcodes.io/postcodes/${encoded}\`)` and lines 91-95 bulk POST |
| `data-max-runner.ts` | `google-places-discovery.ts` | dynamic import | ✓ WIRED | Line 30: `import('./sources/google-places-discovery.js')` |
| `data-max-runner.ts` | `postcodesio-geocoding.ts` | dynamic import | ✓ WIRED | Line 46: `import('./sources/postcodesio-geocoding.js')` |
| `data-max-runner.ts` | `chain-expansion.ts` | dynamic import | ✓ WIRED | Line 38: `import('./chain-expansion.js')` |
| `data-max-runner.ts` | image enrichment (Brave + Street View) | BullMQ queue | ✓ WIRED | Lines 62-82: `discoveryQueue.add('enrich-brave-images', ...)` and `discoveryQueue.add('enrich-streetview', ...)` |
| `public/sw.js` | `/api/search/venues` | network-first | ✓ WIRED | Lines 124-128: `networkFirst(event.request, SEARCH_CACHE)` |
| `public/sw.js` | `/venue/*` | stale-while-revalidate | ✓ WIRED | Lines 130-134: `staleWhileRevalidate(event.request, DETAIL_CACHE)` |
| `app/layout.tsx` | `public/sw.js` | SW registration | ✓ WIRED | Lines 56-66: `navigator.serviceWorker.register('/sw.js')` |
| `app/layout.tsx` | `app/manifest.ts` | `<link rel='manifest'>` | ✓ WIRED | Line 53: `<link rel="manifest" href="/manifest.json" />` |
| `next.config.js` | `public/sw.js` | Cache-Control header | ✓ WIRED | Lines 27-29: `Cache-Control: no-cache, no-store, must-revalidate` |
| `fhrs-batch-match.ts` | `fhrsService` | import | ✓ WIRED | Line 3: `import { fhrsService }` and line 51: `fhrsService.matchFhrsToVenue(...)` |
| `worker.ts` | `fhrs-batch-match.ts` | BullMQ job handler | ✓ WIRED | Line 286: `import('../scripts/discovery/sources/fhrs-batch-match.js')` |
| `fhrsController.ts` | `fhrsService` | lazy match | ✓ WIRED | Line 61: `fhrsService.matchFhrsToVenue(...)` |
| `venue-detail-content.tsx` | `/api/fhrs/match` | FHRS field rendering | ✓ WIRED | Lines 370-384: conditionally renders FHRS card when `fhrs_establishment_id` and `fhrs_rating_value` exist |
| `venue-card.tsx` | `use-shortlist.ts` | `useShortlist()` hook | ✓ WIRED | Line 20: `import { useShortlist } from '@/hooks/use-shortlist'`; Line 135: `const { has, toggle } = useShortlist()` |
| `venue-card.tsx` | `trust.ts` | `trustSignals(venue)` | ✓ WIRED | Line 18: `import { trustSignals } from '@/lib/trust'`; Line 139: `const trust = trustSignals(venue)` |
| `venue-card.tsx` | `isOpenNow` | opening_hours parsing | ✓ WIRED | Line 19: `import { isOpenNow } from '@/lib/opening-hours'`; Line 145: `const openState = isOpenNow(venue.opening_hours)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `google-places-discovery.ts` | `matches` from `textSearch()` | Google Places API (outbound) | ✓ FLOWING — queries external API, writes results to DB via `ON CONFLICT` insert |
| `postcodesio-geocoding.ts` | `coords` from `geocodePostcode()` | postcodes.io API (outbound) | ✓ FLOWING — fetches lat/lon from API, updates DB with COALESCE pattern |
| `data-max-runner.ts` | `results` from `Promise.allSettled()` | 4 sweep functions | ✓ FLOWING — orchestrator aggregates results from all 4 sweeps |
| `fhrs-batch-match.ts` | `match` from `matchFhrsToVenue()` | FHRS API (outbound) | ✓ FLOWING — matches venue by name+postcode, upserts establishment, updates venue |
| `fhrsController.ts` | `match` from `matchFhrsToVenue()` | FHRS API (outbound) | ✓ FLOWING — lazy match on demand, returns FHRS data |
| `venue-card.tsx` | `partyPrice`, `capacity`, etc. | venue prop (from API) | ✓ FLOWING — renders venue data dynamically; party_price_from, party_max_capacity, etc come from DB |
| `venue-detail-content.tsx` | `fhrs_rating_value`, `fhrs_rating_date` | venue prop (from API) | ✓ FLOWING — FHRS data rendered from venue object; conditional on existence |
| `sw.js` | cached responses | Cache API | ✓ FLOWING — intercepts real API responses; caches and serves from network/cache |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Backend TypeScript compilation | `cd backend && npx tsc --noEmit` | Clean (no errors) | ✓ PASS |
| Frontend TypeScript compilation | `cd frontend && npx tsc --noEmit` | Clean (no errors) | ✓ PASS |
| PWA icons valid PNG | `file frontend/public/icon-*.png` | Both valid PNG, correct sizes | ✓ PASS |
| SW file length ≥80 lines | `wc -l frontend/public/sw.js` | 163 lines | ✓ PASS |
| PWA icons exist >100 bytes | `wc -c frontend/public/icon-*.png` | 6271 + 16711 bytes | ✓ PASS |
| Service worker no-cache config | `grep 'Cache-Control' frontend/next.config.js` | `no-cache, no-store, must-revalidate` | ✓ PASS |
| FHRS controller venue ID validation | `grep 'isNaN(venueId)' backend/src/controllers/fhrsController.ts` | Returns 400 for invalid IDs | ✓ PASS |
| CORS production fallback | `grep 'kidspot.london' backend/src/server.ts` | `['https://kidspot.london', 'https://www.kidspot.london']` | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| N/A | No probes declared in phase plans | — | ? SKIP |

### Requirements Coverage

Since no standalone `REQUIREMENTS.md` exists in `.planning/`, requirements are embedded in ROADMAP.md and PLAN frontmatter. All requirement IDs specified for this phase are accounted for:

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| 22-D1 | 22-01-PLAN.md | Google Places discovery sweep | ✓ SATISFIED | `google-places-discovery.ts` — borough-targeted discovery via Text Search API |
| 22-D2 | 22-01-PLAN.md | Chain expansion fallback | ✓ SATISFIED | `chain-expansion.ts` — Google Places primary, Apify fallback |
| 22-D3 | 22-01-PLAN.md | Postcodes.io geocoder | ✓ SATISFIED | `postcodesio-geocoding.ts` — forward + reverse geocoding |
| 22-D4 | 22-01-PLAN.md | Image enrichment | ✓ SATISFIED | `data-max-runner.ts` triggers `enrich-brave-images` and `enrich-streetview` BullMQ jobs |
| 22-F1 | 22-04-PLAN.md | Listing card redo | ✓ SATISFIED | `venue-card.tsx` — mobile-first party-focused card layout |
| 22-F2 | 22-04-PLAN.md | Persistent shortlists | ✓ SATISFIED | `use-shortlist.ts` — localStorage-backed with cross-tab sync (existing, verified) |
| 22-F3 | 22-04-PLAN.md | Side-by-side compare | ✓ SATISFIED | `CompareTable` component — party data columns, empty state handling (existing, verified) |
| 22-F4 | 22-04-PLAN.md | Base64 shortlist sharing | ✓ SATISFIED | `shortlist-link.ts` + `ShareButton` — Web Share API, clipboard, regex validation (existing, verified) |
| 22-F5 | 22-02-PLAN.md | Installable PWA | ✓ SATISFIED | sw.js, manifest.ts, icons, layout.tsx wiring, install prompt, next.config.js headers |
| 22-T1 | 22-03-PLAN.md | FHRS score rendering | ✓ SATISFIED | DB migration, batch job, lazy match endpoint, detail page score card |
| 22-T2 | 22-04-PLAN.md | Data provenance indicators | ✓ SATISFIED | `trust.ts` — FHRS, owner-verified, accessibility signals (existing, verified) |
| 22-I2 | 22-04-PLAN.md | API CORS hardening | ✓ SATISFIED | `server.ts` — CORS_ORIGIN env var, production fallback (existing, verified) |
| 22-I3 | 22-04-PLAN.md | Rate limiting | ✓ SATISFIED | `apiLimiter` — 60 req/min/IP, Redis-backed (existing, verified) |

**Note:** 22-I1 (SSL proxy integration) is intentionally deferred per D-03/D-14 until domain is registered. Not included in requirement IDs list for verification.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `frontend/src/components/venues/venue-card.tsx` | 193 | Comment says "placeholder" | ℹ️ Info | Only a code comment describing the image section (`{/* Image / category placeholder */}`). Not a stub — the section renders a real image or category icon. |

No TBD, FIXME, XXX, TODO, HACK, or implementation stubs found in any phase-modified file. No empty return statements, console.log-only implementations, or hardcoded empty data patterns.

### Human Verification Required

None. All must-haves verified programmatically against the codebase.

### Gaps Summary

No gaps found. All 21 must-have truths are VERIFIED.

---

**Verified:** 2026-07-08T12:00:00Z
**Verifier:** the agent (gsd-verifier)
