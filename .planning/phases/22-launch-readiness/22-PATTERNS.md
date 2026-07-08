# Phase 22: Launch Readiness — Pattern Map

**Mapped:** 2026-07-08
**Files analyzed:** 15 total (5 new, 10 modified)
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/venues/venue-card.tsx` | component | request-response | itself (existing) | self-modify |
| `frontend/src/app/page.tsx` | page | request-response | itself (existing) | self-modify |
| `frontend/public/sw.js` | utility | event-driven | — | no-analog (first PWA) |
| `frontend/src/app/manifest.ts` | config | static | `frontend/src/app/layout.tsx` (metadata pattern) | convention-match |
| `frontend/src/app/layout.tsx` | layout | static | itself (existing) | self-modify |
| `frontend/next.config.js` | config | static | itself (existing) | self-modify |
| `frontend/src/components/venues/venue-detail-content.tsx` | component | request-response | itself (existing) | self-modify |
| `backend/src/worker.ts` | worker | batch-CRUD | itself (existing) | self-modify |
| `backend/scripts/discovery/sources/postcodesio-geocoding.ts` | script | batch-CRUD | `backend/scripts/discovery/sources/google-places-enrichment.ts` | exact |
| `backend/scripts/discovery/data-max-runner.ts` | script | orchestration | `backend/scripts/discovery/run-discovery.ts` | exact |
| `backend/src/controllers/fhrsController.ts` | controller | request-response | `backend/src/controllers/searchController.ts` | exact |
| `backend/src/routes/fhrs.ts` | route | request-response | `backend/src/routes/search.ts` | exact |
| `backend/src/server.ts` | config | static | itself (existing) | self-modify |
| `backend/src/middleware/rateLimit.ts` | middleware | request-response | itself (existing) | self-modify |
| `backend/db/schema.sql` | schema | N/A | `backend/db/migrations/015_add_fhrs_integration.sql` | migration-match |

---

## Pattern Assignments

### `frontend/src/components/venues/venue-card.tsx` (component, request-response)

**Analog:** itself (self-modify — mobile-first party focus redesign)

**Current card layout pattern** (lines 169-354):
The existing `VenueCard` component is a flex column on mobile, flex row on desktop (`flex flex-col sm:flex-row`). The redesign moves party data (price, capacity, CTA) to be more prominent for mobile.

**Key data properties used** (lines 137-145):
```typescript
const isSaved = has(venue.id);
const imageUrl = firstImage(venue);
const trust = trustSignals(venue);
const partyCapable = isPartyCapable(venue);
const partyPrice = partyPriceLabel(venue);
const isFreePark = venue.type === 'park' && !partyPrice;
const capacity = typeof venue.party_max_capacity === 'number' ? venue.party_max_capacity : null;
const enquiryUrl = venue.party_enquiry_url || venue.booking_url || null;
const openState = isOpenNow(venue.opening_hours);
```

**Mobile-first card pattern** (lines 181-183):
```typescript
className={`group relative cursor-pointer overflow-hidden ks-card flex flex-col sm:flex-row ${
  isSelected ? 'ks-card-active' : ''
} ${isGold ? 'ring-2 ring-[#efdf00]' : ''}`}
```

**CTA button pattern** (lines 316-336, 338-350):
```typescript
<a
  href={enquiryUrl}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => handleEnquiry(e, 'enquiry')}
  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-on-primary px-4 py-3 text-sm min-h-[44px] font-bold shadow-sm hover:brightness-95 active:scale-95 transition"
  aria-label={`Enquire about a party at ${venue.name}`}
>
  Enquire
</a>
```

**Party-capable badge pattern** (lines 226-230):
```typescript
<span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-primary text-on-primary px-2.5 py-1 text-[11px] font-bold shadow-sm">
  🎉 Hosts parties
</span>
```

### `frontend/src/app/page.tsx` (page, request-response)

**Analog:** itself (self-modify — add PWA manifest/install prompt)

**Imports pattern** (lines 1-13):
```typescript
'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
```

**Page structure pattern** (lines 102-299):
```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-on-background pb-32 md:pb-12">
      <Header />
      <main>
        <Hero />
        <QuickFilters />
        {/* Results section */}
        <section id="results" className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 sm:mt-8">
          ...
        </section>
      </main>
      <footer>...</footer>
      <BottomNav />
      {selectedVenue && <VenueDetailModal ... />}
    </div>
  );
}
```

### `frontend/public/sw.js` (utility, event-driven) — NEW FILE

**Analog:** No existing SW in codebase. Use patterns from RESEARCH.md.

**Service worker pattern** (RESEARCH.md lines 300-337):
```javascript
const CACHE = 'kidspot-v1';
const SEARCH_CACHE = 'kidspot-search-v1';
const DETAIL_CACHE = 'kidspot-detail-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([
      '/',
      '/manifest.json',
      '/icon-192x192.png',
      '/icon-512x512.png',
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Search results: network-first
  if (url.pathname.startsWith('/api/search/venues')) {
    e.respondWith(networkFirst(e.request, SEARCH_CACHE));
    return;
  }
  // Detail pages: cache-first (stale-while-revalidate)
  if (url.pathname.match(/^\/venue\//)) {
    e.respondWith(staleWhileRevalidate(e.request, DETAIL_CACHE));
    return;
  }
  // Default: network-first for API, cache-first for static
  e.respondWith(url.pathname.startsWith('/api/')
    ? networkFirst(e.request, CACHE)
    : caches.match(e.request) || fetch(e.request));
});
```

**Activation pattern (cache cleanup):**
```javascript
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== SEARCH_CACHE && k !== DETAIL_CACHE)
        .map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});
```

### `frontend/src/app/manifest.ts` (config, static) — NEW FILE

**Analog:** Follows Next.js MetadataRoute.Manifest convention. Theme color matches existing viewport metadata in `layout.tsx` line 22.

**Manifest pattern** (RESEARCH.md lines 495-513):
```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KidSpot London',
    short_name: 'KidSpot',
    description: 'Find brilliant party venues for kids across London',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff9e6',
    theme_color: '#006972',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

### `frontend/src/app/layout.tsx` (layout, static) — MODIFY

**Analog:** itself (self-modify — add manifest link + SW registration)

**Metadata pattern** (lines 13-23):
```typescript
export const metadata: Metadata = {
  title: 'KidSpot London — Find brilliant places for kids',
  description: '...',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fff9e6',
};
```

**Head pattern** (lines 32-52):
```tsx
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
  <link rel="stylesheet" href="..." />
  {/* ADD: manifest link + SW registration script */}
</head>
```

**SW registration pattern** (add in `<head>` or before `</body>`):
```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js');
        });
      }
    `,
  }}
/>
```

### `frontend/next.config.js` (config, static) — MODIFY

**Analog:** itself (self-modify — add headers for SW + manifest)

**Existing config pattern** (lines 1-25):
```javascript
const { withPlausibleProxy } = require('next-plausible');

/** @type {import('next').NextConfig} */
const nextConfig = withPlausibleProxy()({
  output: 'standalone',
  images: {
    remotePatterns: [...],
  },
  reactStrictMode: true,
});
```

**Headers pattern to add** (RESEARCH.md lines 469-490):
```javascript
async headers() {
  return [
    {
      source: '/sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ];
}
```

### `frontend/src/components/venues/venue-detail-content.tsx` (component, request-response) — MODIFY

**Analog:** itself (self-modify — add FHRS score section)

**Info card pattern** (lines 338-366) — use for FHRS score rendering:
```tsx
{(address || mergedDetails.postcode || mergedDetails.borough) && (
  <div className="flex items-start gap-3 p-4 bg-surface rounded-[16px] border border-outline-variant">
    <span className="material-symbols-outlined text-outline">location_on</span>
    <div className="flex flex-col">
      {address && <span className="font-body-md text-body-md text-on-surface">{address}</span>}
      ...
    </div>
  </div>
)}
```

**FHRS score card pattern** (RESEARCH.md lines 518-535):
```tsx
{venue.fhrs_establishment_id && venue.fhrs_rating_value !== undefined ? (
  <div className="flex items-center gap-3 p-4 bg-surface rounded-[16px] border border-outline-variant">
    <span className="material-symbols-outlined text-outline">verified_user</span>
    <div>
      <span className="font-body-md text-body-md text-on-surface">
        Food Hygiene Rating: {venue.fhrs_rating_value}/5
      </span>
      {venue.fhrs_rating_date && (
        <span className="block text-xs text-on-surface-variant">
          Rated {new Date(venue.fhrs_rating_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </span>
      )}
    </div>
  </div>
) : null}
```

### `backend/src/worker.ts` (worker, batch-CRUD) — MODIFY

**Analog:** itself (self-modify — add FHRS batch matching job)

**Existing BullMQ job registration pattern** (lines 42-137):
```typescript
await discoveryQueue.add('enrich-google-places', { batchSize: 50 }, {
  repeat: { pattern: '0 */4 * * *' },
  jobId: 'repeat:enrich-google-places',
  ...jobOpts,
});
```

**Existing job handler pattern** (lines 243-250):
```typescript
case 'enrich-google-places': {
  await crawlDelay(500);
  const { enrichViaGooglePlaces } = await import('../scripts/discovery/sources/google-places-enrichment.js');
  const batchSize = (job.data as EnrichmentJobData)?.batchSize || 50;
  const result = await enrichViaGooglePlaces(batchSize);
  logger.info({ result }, 'Google Places enrichment complete');
  return { status: 'completed', ...result };
}
```

**FHRS job to add** — follows exact same pattern:
```typescript
case 'enrich-fhrs-batch': {
  await crawlDelay(600);
  const { batchMatchFhrs } = await import('../scripts/discovery/sources/fhrs-batch-match.js');
  const batchSize = (job.data as EnrichmentJobData)?.batchSize || 50;
  const result = await batchMatchFhrs(batchSize);
  logger.info({ result }, 'FHRS batch matching complete');
  return { status: 'completed', ...result };
}
```

**Existing job interface** (lines 23-26):
```typescript
interface EnrichmentJobData {
  batchSize?: number;
  layer?: 'geocode' | 'osm-contacts' | 'web-scrape' | 'apify';
}
```

### `backend/scripts/discovery/sources/postcodesio-geocoding.ts` (script, batch-CRUD) — NEW FILE

**Analog:** `backend/scripts/discovery/sources/google-places-enrichment.ts` (exact same enrichment pattern)

**Imports pattern** (google-places-enrichment.ts lines 1-4):
```typescript
import { db } from '../../../src/clients/db.js';
import { googlePlacesService } from '../../../src/services/googlePlacesService.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';
```

**Result interface pattern** (lines 6-11):
```typescript
export interface GooglePlacesEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}
```

**Core enrichment function pattern** (lines 20-115):
```typescript
export async function enrichViaGooglePlaces(batchSize: number = 50): Promise<GooglePlacesEnrichmentResult> {
  const result: GooglePlacesEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  if (!env.GOOGLE_PLACES_API_KEY) {
    logger.warn('Google Places enrichment skipped: GOOGLE_PLACES_API_KEY not configured.');
    return result;
  }

  try {
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon, website, phone
       FROM venues
       WHERE is_active = TRUE
         AND venue_scope = 'core'
         AND lat IS NOT NULL AND lon IS NOT NULL
         AND (...missing data condition...)
         AND (google_places_enriched_at IS NULL OR google_places_enriched_at < NOW() - INTERVAL '30 days')
       ORDER BY id ASC
       LIMIT $1`,
      [batchSize]
    );

    for (const venue of venues) {
      result.totalProcessed++;
      try {
        await new Promise((resolve) => setTimeout(resolve, 500)); // rate limiting
        
        const match = await someService.findPlace(venue.name, lat, lon);
        
        if (!match) {
          await db.query(`UPDATE venues SET ...skipped_marker... = NOW() WHERE id = $1`, [venue.id]);
          result.skipped++;
          continue;
        }
        
        await db.query(
          `UPDATE venues SET
             ...columns... = COALESCE($1, ...columns...),
             enriched_at = NOW()
           WHERE id = $2`,
          [...values, venue.id]
        );
        result.enriched++;
      } catch (err: any) {
        logger.error({ err, venueId: venue.id, name: venue.name }, 'Error message');
        result.failed++;
      }
    }
  } catch (err: any) {
    logger.error({ err }, 'Pipeline error');
    throw err;
  }

  logger.info(result, 'Batch completed.');
  return result;
}
```

**CLI entry point pattern** (lines 118-125):
```typescript
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  enrichViaGooglePlaces(10)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

### `backend/scripts/discovery/data-max-runner.ts` (script, orchestration) — NEW FILE

**Analog:** `backend/scripts/discovery/run-discovery.ts` (same orchestration pattern)

**Orchestration pattern** (run-discovery.ts lines 1-34):
```typescript
import { discoverVenuesFromOSM } from './osm-discovery.js';
import { logger } from '../../src/config/logger.js';

export async function runAllDiscovery() {
  logger.info('=== KidSpot London - Venue Discovery ===');
  const startTime = Date.now();
  
  try {
    logger.info('--- OpenStreetMap Discovery ---');
    await discoverVenuesFromOSM();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.info({ durationSeconds: duration }, '=== All Discovery Complete ===');
  } catch (error: any) {
    logger.error({ err: error }, 'Fatal error during all discovery');
    throw error;
  }
}

import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  runAllDiscovery()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error({ err: error }, 'Fatal error');
      process.exit(1);
    });
}
```

### `backend/src/controllers/fhrsController.ts` (controller, request-response) — NEW FILE

**Analog:** `backend/src/controllers/searchController.ts` (exact same controller pattern)

**Imports pattern** (searchController.ts lines 1-5):
```typescript
import { Request, Response } from 'express';
import { venueService } from '../services/venueService.js';
import { logger } from '../config/logger.js';
import { SearchQuery, VenueType } from '../types/venue.js';
import { searchQuerySchema, facetSearchSchema } from '../schemas/searchSchema.js';
```

**Controller method structure** (lines 7-34):
```typescript
export const searchController = {
  async searchVenues(req: Request, res: Response) {
    try {
      const validationResult = searchQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0]?.message || 'Invalid search parameters',
          details: validationResult.error.message
        });
      }
      const response = await venueService.searchVenues(query);
      return res.json(response);
    } catch (error) {
      logger.error({ err: error }, 'Error in searchVenues controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to search venues'
      });
    }
  },
};
```

**GET-by-param pattern** (lines 83-115):
```typescript
async getVenueDetailsBySlug(req: Request, res: Response) {
  try {
    const slug = req.params.slug as string;
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'slug is required'
      });
    }
    const response = await venueService.getVenueDetailsBySlug(slug);
    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }
    return res.json(response);
  } catch (error) {
    logger.error({ err: error, slug: String(req.params.slug ?? '') }, 'Error...');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch venue details'
    });
  }
},
```

### `backend/src/routes/fhrs.ts` (route, request-response) — NEW FILE

**Analog:** `backend/src/routes/search.ts` (exact same route pattern)

**Route pattern** (search.ts lines 1-48):
```typescript
import express from 'express';
import { searchController } from '../controllers/searchController.js';

const router = express.Router();

/**
 * @route GET /api/search/venues
 * @desc Search venues by location/radius or borough
 */
router.get('/venues', searchController.searchVenues);

export default router;
```

**Route registration in server.ts** (server.ts lines 99-105):
```typescript
app.use('/api/search', searchRoutes);
```

### `backend/src/server.ts` (config, static) — MODIFY

**Analog:** itself (self-modify — add new route, CORS config)

**CORS config pattern** (lines 40-49):
```typescript
const CORS_ALLOWED = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' ? ['https://kidspot.london', 'https://www.kidspot.london'] : true);
app.use(cors({
  origin: CORS_ALLOWED,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ingest-timestamp', 'x-ingest-signature']
}));
```

**Route registration pattern** (lines 99-105):
```typescript
app.use('/api/search', searchRoutes);
// ADD: app.use('/api/fhrs', fhrsRoutes);
```

### `backend/src/middleware/rateLimit.ts` (middleware, request-response) — NO CHANGE NEEDED (already exists)

**Analog:** itself (already Redis-backed, already active on `/api/`)

**Existing rate limit pattern** (lines 11-37):
```typescript
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../clients/redis.js";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: "Too many requests..." },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.call(args[0]!, ...args.slice(1)) as Promise<RedisReply>,
    prefix: "rl:api:",
  }),
  handler: (req, res, _next, options) => {
    logger.warn({ ip: req.ip, method: req.method, url: req.url }, "Rate limit exceeded");
    res.status(options.statusCode).send(options.message);
  },
});
```

### `backend/db/schema.sql` (schema) — VERIFY ONLY

**Analog:** `backend/db/migrations/015_add_fhrs_integration.sql`

**FHRS columns already exist** in migration 015 (lines 35-37):
```sql
ALTER TABLE venues ADD COLUMN IF NOT EXISTS fhrs_establishment_id BIGINT REFERENCES fhrs_establishments(id);
CREATE INDEX IF NOT EXISTS idx_venues_fhrs_id ON venues(fhrs_establishment_id);
```

**Key findings:** The `fhrs_establishments` table (lines 8-28) does NOT have `fhrs_rating_value` or `fhrs_matched_at` columns directly on the `venues` table. These live on the `fhrs_establishments` table as `rating_value`, `rating_key`, `rating_date`. The batch job needs to join/read from the `fhrs_establishments` table via `fhrs_establishment_id`.

The batch script template in RESEARCH.md references updating `fhrs_establishment_id`, `fhrs_rating_value`, `fhrs_rating_date`, and `fhrs_matched_at` on the `venues` table. These columns DO NOT currently exist on `venues` — only `fhrs_establishment_id` exists (from migration 015). A migration ADDING `fhrs_rating_value`, `fhrs_rating_date`, and `fhrs_matched_at` to the `venues` table is needed OR the batch job should write to the `fhrs_establishments` table and read via JOIN.

---

## Shared Patterns

### Authentication / Security Middleware
**Source:** `backend/src/server.ts` (lines 28-49) + `backend/src/middleware/rateLimit.ts`
**Apply to:** New FHRS routes use same rate limiter and CORS as existing routes
```typescript
app.use('/api/', apiLimiter);  // line 52 — already applied globally
// New routes auto-inherit rate limiting + CORS
```

### Enrichment Script Pattern
**Source:** `backend/scripts/discovery/sources/google-places-enrichment.ts`
**Apply to:** `postcodesio-geocoding.ts` and any new enrichment scripts

Key patterns to follow:
1. Export typed `Result` interface with `{ enriched, skipped, failed, totalProcessed }`
2. Guard clause for missing API key/env var
3. SQL query: `SELECT ... FROM venues WHERE is_active AND venue_scope = 'core' AND ... ORDER BY id ASC LIMIT $1`
4. Rate limiting via `await new Promise((resolve) => setTimeout(resolve, 500))`
5. COALESCE/NULLIF write-safe UPDATE pattern: `COALESCE(NULLIF($1, ''), column_name)`
6. Wrap each venue in try/catch, increment `failed` counter
7. Wrap entire pipeline in try/catch, re-throw for BullMQ retry
8. CLI entry point with `isMainModule` check + `process.exit(0/1)`

### Error Handling (Express Controllers)
**Source:** `backend/src/controllers/searchController.ts`
**Apply to:** `fhrsController.ts`
```typescript
try {
  // validate input
  // call service
  // return response
} catch (error) {
  logger.error({ err: error }, 'Error in [method] controller');
  return res.status(500).json({
    success: false,
    error: 'Failed to [action]'
  });
}
```

### BullMQ Job Pattern
**Source:** `backend/src/worker.ts` (lines 148-307)
**Apply to:** FHRS batch matching job
1. Register repeatable job in `setupRepeatingJobs()` with cron pattern + `jobId: 'repeat:enrich-fhrs-batch'`
2. Add `case 'enrich-fhrs-batch':` in `processJob()` switch
3. Add `crawlDelay()` before import for polite rate limiting
4. Dynamic import the script module
5. Log result, return `{ status: 'completed', ...result }`

### Validation Pattern
**Source:** `backend/src/controllers/searchController.ts` (lines 13-20)
**Apply to:** `fhrsController.ts` if any input validation needed
```typescript
const validationResult = searchQuerySchema.safeParse(req.query);
if (!validationResult.success) {
  return res.status(400).json({
    success: false,
    error: validationResult.error.issues[0]?.message || 'Invalid parameters',
    details: validationResult.error.message
  });
}
```

### React Client Component Pattern
**Source:** `frontend/src/components/venues/share-button.tsx`
**Apply to:** Any new frontend components, PWA install prompt
```typescript
'use client';
import { toast } from 'sonner';

interface ComponentProps { ... }

export function ComponentName({ ... }: ComponentProps) {
  const handleAction = async () => {
    try {
      // do something
    } catch (err) {
      toast.error('Failed to ...');
    }
  };

  return (
    <button onClick={handleAction} className="...">
      ...
    </button>
  );
}
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/public/sw.js` | utility | event-driven | First service worker in the project. Use standard PWA/caching patterns from RESEARCH.md. |
| `frontend/src/app/manifest.ts` | config | static | First PWA manifest. Follows Next.js `MetadataRoute.Manifest` convention — no existing manifest to copy. |

---

## Metadata

**Analog search scope:** `frontend/src/`, `backend/src/`, `backend/scripts/`, `backend/db/`
**Files scanned:** 30+ (components, controllers, routes, scripts, middleware, config)
**Pattern extraction date:** 2026-07-08
