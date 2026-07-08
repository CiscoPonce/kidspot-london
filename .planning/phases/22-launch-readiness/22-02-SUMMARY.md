---
phase: 22-launch-readiness
plan: 02
subsystem: frontend
tags: pwa, service-worker, manifest, offline-caching, install-prompt
requires:
  - phase: 22
    provides: research and decisions on PWA approach (D-06, D-07, D-08)
provides:
  - Installable PWA with manual service worker
  - Offline caching for search results and venue detail pages
  - Web App Manifest with correct theming
  - Install prompt component for beforeinstallprompt event
affects: launch-readiness, end-user engagement
tech-stack:
  added: []
  patterns:
    - Manual service worker with versioned Cache API caches (no Workbox)
    - network-first strategy for search API
    - stale-while-revalidate for venue detail pages
    - cache-first for static assets
    - next.config.js headers() for SW lifecycle management
key-files:
  created:
    - frontend/public/sw.js — Manual service worker (163 lines) with install/activate/fetch lifecycle
    - frontend/public/icon-192x192.png — PWA icon 192×192 (KS branding on teal)
    - frontend/public/icon-512x512.png — PWA icon 512×512 (KS branding on teal)
    - frontend/src/app/manifest.ts — Dynamic Web App Manifest (MetadataRoute.Manifest)
    - frontend/src/components/layout/pwa-install-prompt.tsx — Client component for beforeinstallprompt
  modified:
    - frontend/src/app/layout.tsx — Added manifest link, SW registration script, iOS meta tags, PwaInstallPrompt
    - frontend/next.config.js — Added async headers() for sw.js no-cache + global security headers
key-decisions:
  - "Theme color #006972 used in manifest (matches brand identity)"
  - "Background color #fff9e6 used in manifest (matches existing body background)"
  - "SW registered via inline script in layout head (avoids client component import complexity)"
  - "ImageMagick used for icon generation (available in CI, no sharp/canvas dependency)"
requirements-completed:
  - 22-F5
duration: 1 min
completed: 2026-07-08
---

# Phase 22: Launch Readiness — Plan 02 Summary

**Manual service worker with versioned caching strategies, dynamic Web App Manifest, PWA icons, and install prompt component**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-08T11:41:37Z
- **Completed:** 2026-07-08T11:42:51Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Service worker (`sw.js`) with 4 versioned caches: static (app shell), search, detail, and general
- Three caching strategies: network-first for search, stale-while-revalidate for venue detail, cache-first for static assets
- App shell pre-cached on install (`/`, `/manifest.json`, icons)
- Old cache cleanup on activate with `clients.claim()`
- Dynamic manifest at `/manifest.json` with correct name, theme (#006972), background (#fff9e6), and icon references
- Manifest link, SW registration script, and iOS PWA meta tags added to layout `<head>`
- `next.config.js` configured to serve `sw.js` with `no-cache` headers (prevents SW staleness)
- Global security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- PWA install prompt component listens for `beforeinstallprompt`, shows bottom banner with Install/Not now buttons
- Install prompt uses existing Tailwind theme tokens (`bg-surface`, `border-outline-variant`, `text-on-surface`, `primary`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PWA service worker, manifest, and icons** — `4bcad5d` (feat)
2. **Task 2: Wire PWA into layout.tsx, next.config.js, and create install prompt** — `bb923e8` (feat)

**Plan metadata:** (final commit)

## Files Created/Modified

- `frontend/public/sw.js` — Manual service worker with versioned caching strategies
- `frontend/public/icon-192x192.png` — 192×192 PWA icon
- `frontend/public/icon-512x512.png` — 512×512 PWA icon
- `frontend/src/app/manifest.ts` — Dynamic Web App Manifest
- `frontend/src/components/layout/pwa-install-prompt.tsx` — Install prompt client component
- `frontend/src/app/layout.tsx` — Updated with manifest link, SW registration, iOS meta tags, install prompt
- `frontend/next.config.js` — Added headers for sw.js and global security

## Decisions Made

- **Theme color #006972** — Chosen for manifest (matches brand teal identity, typical for browser chrome)
- **Background color #fff9e6** — Matches existing body background for splash screen consistency
- **Inline SW registration** — Added as inline script in layout head rather than separate JS file, keeps setup simple
- **ImageMagick for icons** — Used `convert` for icon generation (available in CI/CD pipeline, no npm dependency needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **PNG generation tooling** — `sharp` and `canvas` npm packages were not installed. Used ImageMagick `convert` instead, which was available on the system. Produces valid PNG files with KS branding overlay.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All PWA files created and wired into the application
- Ready for the next Phase 22 plan (launch readiness tasks)
- Manual verification needed: Open Chrome DevTools → Application → Manifest to confirm manifest loads, verify install prompt fires on supported browsers

## Self-Check: PASSED

- ✅ All 5 created files exist on disk
- ✅ All 3 commits found in git log
- ✅ TypeScript compiles without errors
- ✅ Service worker ≥80 lines with install/activate/fetch events
- ✅ Valid PNG icons with correct headers
- ✅ Manifest exports MetadataRoute.Manifest function
- ✅ Layout has manifest link, SW registration, iOS meta tags, PwaInstallPrompt component
- ✅ next.config.js has headers() with SW no-cache and security headers
- ✅ Install prompt component has beforeinstallprompt listener with install/dismiss UI

---

*Phase: 22-launch-readiness*
*Completed: 2026-07-08*
