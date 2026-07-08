---
phase: 22-launch-readiness
reviewed: 2026-07-08T12:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/src/services/googlePlacesService.ts
  - backend/scripts/discovery/sources/google-places-discovery.ts
  - backend/scripts/discovery/sources/postcodesio-geocoding.ts
  - backend/scripts/discovery/chain-expansion.ts
  - backend/scripts/discovery/data-max-runner.ts
  - frontend/public/sw.js
  - frontend/src/app/manifest.ts
  - frontend/src/app/layout.tsx
  - frontend/next.config.js
  - frontend/src/components/layout/pwa-install-prompt.tsx
  - backend/db/migrations/038_add_fhrs_venue_rating_fields.sql
  - backend/scripts/discovery/sources/fhrs-batch-match.ts
  - backend/src/worker.ts
  - backend/src/controllers/fhrsController.ts
  - backend/src/routes/fhrs.ts
  - backend/src/server.ts
  - frontend/src/lib/api.ts
  - frontend/src/components/venues/venue-detail-content.tsx
  - frontend/src/components/venues/venue-card.tsx
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 22: Launch Readiness — Code Review Report

**Reviewed:** 2026-07-08T12:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed 18 source files across frontend, backend services, scripts, migrations, and PWA infrastructure. Found 2 critical issues (queue name mismatch causing silent job loss; API token in URL query parameters), 5 warnings (display bug, unawaited promise, inconsistent scripting patterns, missing cooldown, missing null guards), and 3 info items.

The PWA implementation (service worker, manifest, install prompt) is solid. The FHRS integration (batch matching, lazy controller, migration) is well-structured. The data-max orchestration has the most significant defect — image enrichment jobs added to the wrong BullMQ queue will never execute.

---

## Critical Issues

### CR-01: Image enrichment jobs never execute due to BullMQ queue name mismatch

**File:** `backend/scripts/discovery/data-max-runner.ts:57`
**Related:** `backend/src/worker.ts:32,324`

**Issue:** The `data-max-runner.ts` creates a BullMQ queue with name `'kidspot-discovery'` (line 57) and adds `enrich-brave-images` and `enrich-streetview` jobs to it (lines 63-82). However, the worker in `worker.ts` creates and listens to a queue named `'discovery'` (line 32: `new Queue('discovery', ...)`, line 324: `new Worker('discovery', ...)`). These are different queue names. The worker will never pick up jobs from the `kidspot-discovery` queue. Image enrichment jobs will sit in Redis until they expire (24h due to `removeOnComplete/removeOnFail` settings) without ever being processed.

This is a silent failure — `discoveryQueue.add()` returns success (BullMQ accepts the job), but no worker consumes it.

```typescript
// data-max-runner.ts:57 — WRONG queue name
const discoveryQueue = new Queue('kidspot-discovery', { connection: redisClient });

// worker.ts:32 — CORRECT queue name
const discoveryQueue = new Queue('discovery', { connection: redis });

// worker.ts:324 — worker listens to 'discovery'
const discoveryWorker = new Worker('discovery', processJob, { ... });
```

**Fix:** Change the queue name in `data-max-runner.ts` to match the worker:
```typescript
// data-max-runner.ts line 57
const discoveryQueue = new Queue('discovery', { connection: redisClient });
```

---

### CR-02: Apify API token exposed in URL query parameters (credential leakage)

**File:** `backend/scripts/discovery/chain-expansion.ts:96,119,133`

**Issue:** The Apify API token is passed as a URL query parameter (`?token=${APIFY_TOKEN}`) in three separate API requests. This is a security vulnerability — query parameters are commonly logged by:
- Reverse proxies (Nginx, Caddy, Cloudflare)
- Server access logs
- Browser history (if the URL is ever rendered)
- Referrer headers in outgoing requests
- Network monitoring tools

The Apify API supports Bearer token authentication via the `Authorization` header, which avoids these leakage vectors.

```typescript
// Line 96 — insecure
const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
  // ...
});

// Line 119 — insecure
const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`, {
  headers: browserHeaders(),
});

// Line 133 — insecure
const datasetRes = await fetch(
  `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`,
  { headers: browserHeaders() },
);
```

**Fix:** Use the `Authorization: Bearer` header instead of query parameter:
```typescript
const authHeaders = { Authorization: `Bearer ${APIFY_TOKEN}` };

// Line 96
const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs`, {
  method: 'POST',
  headers: { ...browserHeaders(), 'Content-Type': 'application/json', ...authHeaders },
  body: JSON.stringify({ /* ... */ }),
});

// Line 119
const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
  headers: { ...browserHeaders(), ...authHeaders },
});

// Line 133
const datasetRes = await fetch(
  `https://api.apify.com/v2/actor-runs/${runId}/dataset/items`,
  { headers: { ...browserHeaders(), ...authHeaders } },
);
```

---

## Warnings

### WR-01: FHRS rating display condition allows `null` value through

**File:** `frontend/src/components/venues/venue-detail-content.tsx:370`

**Issue:** The rendering condition for the FHRS rating block checks `(venue as Venue).fhrs_rating_value !== undefined` but does not exclude `null`. In JavaScript, `null !== undefined` evaluates to `true`. If `fhrs_establishment_id` is set (truthy) but `fhrs_rating_value` is `null` (possible when FHRS API returns no rating, e.g., "Exempt" or "Awaiting Inspection"), the component renders `"Food Hygiene Rating: /5"` with an empty value.

The `Venue` interface types `fhrs_rating_value` as `string | null | undefined`, so all three states are possible.

**Current code (line 370):**
```tsx
{(venue as Venue).fhrs_establishment_id && (venue as Venue).fhrs_rating_value !== undefined && (
```

**Fix:** Use `!= null` to exclude both `null` and `undefined`:
```tsx
{(venue as Venue).fhrs_establishment_id && (venue as Venue).fhrs_rating_value != null && (
```

---

### WR-02: `deferredPrompt.prompt()` not awaited

**File:** `frontend/src/components/layout/pwa-install-prompt.tsx:32`

**Issue:** The `prompt()` method on the `beforeinstallprompt` event returns a `Promise<void>`. The current code calls `deferredPrompt.prompt()` without `await`, then immediately accesses `deferredPrompt.userChoice`. While most browser implementations resolve the prompt synchronously, the API contract specifies it returns a Promise. Not awaiting it could lead to race conditions in some browsers or future spec changes.

```typescript
const handleInstall = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();  // Promise not awaited — should be awaited
  const { outcome } = await deferredPrompt.userChoice;
  // ...
};
```

**Fix:**
```typescript
const handleInstall = async () => {
  if (!deferredPrompt) return;

  await deferredPrompt.prompt();  // await the prompt
  const { outcome } = await deferredPrompt.userChoice;
  // ...
};
```

---

### WR-03: Inconsistent entry-point detection pattern may fail with relative paths

**File:** `backend/scripts/discovery/chain-expansion.ts:210`

**Issue:** This file uses a non-standard entry-point detection pattern:
```typescript
if (import.meta.url === `file://${process.argv[1]}`) {
```

All other scripts in the project use the canonical pattern:
```typescript
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
```

The chain-expansion pattern breaks when the script is invoked with a relative path (e.g., `node scripts/discovery/chain-expansion.js` vs `node /absolute/path/to/scripts/discovery/chain-expansion.js`), because `import.meta.url` is always an absolute `file://` URL but `process.argv[1]` may be relative.

**Fix:** Use the same pattern as all other scripts:
```typescript
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = process.argv.slice(2);
  discoverChains(args.includes('--dry-run'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

---

### WR-04: No cooldown for on-demand FHRS lazy matching

**File:** `backend/src/controllers/fhrsController.ts:60-66`

**Issue:** The lazy FHRS match endpoint (`/api/fhrs/match/:id`) calls the FHRS API every time it's invoked for a venue without a prior match. Unlike the batch script (`fhrs-batch-match.ts`), which has a 90-day retry window via `(fhrs_matched_at IS NULL OR fhrs_matched_at < NOW() - INTERVAL '90 days')`, the on-demand controller has no cooldown. A user could repeatedly call this endpoint and consume FHRS API quota (free tier: 600 req/min) on unmatched venues.

**Fix:** Add a cooldown check — skip the API call if a match was recently attempted:
```typescript
// After querying the venue (line 39-40), check if recently attempted
const { rows: matchedAttempts } = await db.query(
  `SELECT fhrs_matched_at FROM venues WHERE id = $1`,
  [venueId]
);

if (matchedAttempts[0]?.fhrs_matched_at &&
    matchedAttempts[0].fhrs_matched_at > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  return res.json({
    success: true,
    data: { fhrs_establishment_id: null, rating_value: null, rating_date: null },
    meta: { cooldown: true }
  });
}
```

---

### WR-05: Missing null guards for lat/lon values in chain-expansion INSERT

**File:** `backend/scripts/discovery/chain-expansion.ts:155-156,180-181**

**Issue:** The chain-expansion script passes lat/lon values directly to the `db.query` parameter array without null-coalescing, unlike `google-places-discovery.ts` which uses `match.lat ?? null`. When `item.location` is undefined or `item.location.lat` is undefined, the value `undefined` is passed as a SQL parameter. While node-postgres may convert `undefined` to `NULL`, this behavior is not part of the documented API contract and differs from the explicit `?? null` pattern used consistently elsewhere.

```typescript
// chain-expansion.ts lines 155-156 — no null guard
const lat = item.location?.lat;   // can be undefined
const lon = item.location?.lng;   // can be undefined

// Used at lines 180-181 as query parameter
lat,    // undefined passed directly
lon,    // undefined passed directly
```

**Fix:**
```typescript
const lat = item.location?.lat ?? null;
const lon = item.location?.lng ?? null;
```

---

## Info

### IN-01: Service worker catch blocks silently swallow all errors

**File:** `frontend/public/sw.js:62,105`

**Issue:** The `networkFirst` and `cacheFirst` helper functions use empty `catch` blocks that silently swallow errors. While graceful degradation is expected in service workers (fail → fallback to cache), the catch blocks don't log errors, making debugging offline/network failures difficult.

**Suggestion:** Add logging to catch blocks for debugging:
```javascript
catch (err) {
  console.warn('[SW] Network request failed:', err.message);  // or similar logging
  const cached = await caches.match(request);
  // ...
}
```

**Severity rationale:** Service workers intentionally swallow errors for resilience. This is marked Info because the current behavior is functionally correct (fallback to cache on failure), but logging would aid debugging.

---

### IN-02: PWA manifest missing orientation and categories fields

**File:** `frontend/src/app/manifest.ts:3-18**

**Issue:** The manifest declares `display: 'standalone'` but does not set `orientation` or `categories`. Without `orientation`, some browsers may allow rotation to landscape on a portrait-optimized app. `categories` helps app stores classify the PWA.

**Suggestion:**
```typescript
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KidSpot London — Find brilliant party venues for kids',
    short_name: 'KidSpot',
    description: 'Find soft play, parks, museums and party venues for kids across London',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',     // Add — app is mobile-first portrait
    categories: ['kids', 'family', 'events', 'local'],  // Add
    background_color: '#fff9e6',
    theme_color: '#006972',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

---

### IN-03: Worker.ts inconsistent switch-case indentation

**File:** `backend/src/worker.ts:178-292`

**Issue:** The `processJob` switch statement has inconsistent indentation across cases. Approximately half the cases are indented 1 level (`case 'enrich-geocode':` at column 7) and half are indented at varying levels. This is a readability/maintainability concern that increases the risk of future logic errors.

**Suggestion:** Normalize all `case` statements to the same indentation level (consistent with the rest of the project's TypeScript conventions).

---

_Reviewed: 2026-07-08T12:00:00Z_
_Reviewer: gsd-code-reviewer agent_
_Depth: standard_
