# Phase 5: SEO & Detail Pages - Research

**Researched:** 2024-04-17
**Domain:** SEO, Dynamic Routing, Metadata, Sharing UX
**Confidence:** HIGH

## Summary

This phase focuses on making KidSpot venues discoverable and shareable. Key architectural shifts include moving from an ID-based detail modal to standalone, slug-based venue pages. This requires a backend schema update for slugs, a migration to backfill existing data, and a robust Next.js 14 App Router implementation for dynamic routing and metadata.

**Primary recommendation:** Use the `slugify` library with a custom collision strategy (4-character random hash) to ensure URL stability while maintaining SEO-friendly paths like `/venue/starbucks-islington-8f2a`.

<user_constraints>
## User Constraints (from 05-CONTEXT.md)

### Locked Decisions
- **Schema**: Add a `slug` column to the `venues` table with a unique index.
- **Generation Logic**: `slugify(name) + "-" + slugify(borough/area)`.
- **Collision Strategy**: If a slug exists, append a 4-character random hash (e.g., `starbucks-islington-8f2a`).
- **Backend API**: Add `GET /api/search/venues/slug/:slug/details` to resolve venue details via slug.
- **SEO**: Use Next.js `generateMetadata()` in `[slug]/page.tsx` for dynamic title/description.
- **JSON-LD**: Inject `LocalBusiness` structured data for search engine visibility.
- **Routes**: `/venues-in/[borough]` and `/venues-by/[type]`.
- **Sharing UX**: Web Share API with "Copy to Clipboard" fallback.
- **Sitemaps**: Dynamic `sitemap.ts` in Next.js.

### the agent's Discretion
- Exact slugify library selection (e.g., `slugify` or custom regex).
- UI/UX of the share button placement and toast notification style.
- Exact JSON-LD fields (beyond `LocalBusiness` core fields).

### Deferred Ideas (OUT OF SCOPE)
- Dynamic OpenGraph image generation (Phase 6).
- User-generated reviews (Phase 7+).
- Advanced search filters on landing pages.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEO-01 | Add `slug` column and unique index | SQL migration research confirms GIN/Btree performance. |
| SEO-02 | Slug generation logic with collision handling | `slugify` library + random hash strategy verified. |
| SEO-03 | Dynamic routing `/venue/[slug]` | Next.js 14 App Router `[slug]` patterns verified. |
| SEO-04 | Dynamic SEO Metadata | `generateMetadata` and OpenGraph research completed. |
| SEO-05 | JSON-LD Structured Data | `LocalBusiness` and `EventVenue` schema fields identified. |
| SEO-06 | Share to Clipboard / Web Share API | Implementation strategy for mobile vs. desktop verified. |
| SEO-07 | Sitemaps and Indexing | `sitemap.ts` dynamic route implementation documented. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [slugify](https://www.npmjs.com/package/slugify) | 1.6.6 | String to slug conversion | Industry standard, zero dependencies, supports accents. |
| [sonner](https://sonner.emilkowal.ski/) | 1.5.0 | Toast notifications | Modern, lightweight, works perfectly with Next.js 14 App Router. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| [lucide-react](https://lucide.dev/) | 0.400.0 | Icons (Share, Copy) | Existing project dependency for UI icons. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `slugify` | `@sindresorhus/slugify` | ESM-only, harder for current CommonJS backend. |
| `nanoid` | `crypto.randomBytes` | Built-in `crypto` means zero dependencies for the collision hash. |

**Installation:**
```bash
# Backend
cd backend && npm install slugify
# Frontend
cd frontend && npm install sonner
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/app/
├── sitemap.ts                # Dynamic sitemap generation
├── venue/
│   └── [slug]/
│       └── page.tsx          # Standalone venue detail page
├── venues-in/
│   └── [borough]/
│       └── page.tsx          # Borough landing page
└── venues-by/
    └── [type]/
        └── page.tsx          # Category landing page
```

### Pattern 1: Slug Generation with Hash
**What:** Generate a slug, check for collision, and append a random hash if needed.
**When to use:** On venue creation (import) and as a migration for existing venues.
**Example:**
```javascript
const slugify = require('slugify');
const crypto = require('crypto');

function generateSlug(name, area) {
  const base = slugify(`${name}-${area}`, { lower: true, strict: true });
  const hash = crypto.randomBytes(2).toString('hex'); // 4 characters
  return `${base}-${hash}`;
}
```

### Anti-Patterns to Avoid
- **Client-side SEO:** Do not fetch metadata client-side. Always use `generateMetadata` in Server Components for search engine crawlers.
- **Slug-only Lookup without index:** Always ensure the `slug` column in PostgreSQL has a `UNIQUE INDEX` to prevent race conditions and ensure query performance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| String Sanitization | Custom RegEx | `slugify` | Edge cases like accents, emojis, and special characters are hard to get right. |
| Clipboard Access | `document.execCommand` | `navigator.clipboard` | Modern, secure API with better support. |
| Sitemap XML | Manual template | `sitemap.ts` | Next.js handles XML headers and caching automatically. |

## Common Pitfalls

### Pitfall 1: Slug Collisions on Import
**What goes wrong:** Parallel imports or duplicate venues cause `UNIQUE constraint` violations.
**How to avoid:** Use a `DO UPDATE` or `ON CONFLICT` strategy in SQL, but for slugs, ensure the random hash is appended *before* insertion attempt if the initial slug exists.

### Pitfall 2: SEO Crawlability of Modals
**What goes wrong:** Search engines can't crawl content inside a React State modal.
**How to avoid:** Standalone `/venue/[slug]` pages ensure every venue is a reachable URL.

## Code Examples

### Next.js Dynamic Metadata & JSON-LD
```typescript
// src/app/venue/[slug]/page.tsx
import { Metadata } from 'next';
import { getVenueBySlug } from '@/lib/api';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const venue = await getVenueBySlug(params.slug);
  return {
    title: `${venue.name} | KidSpot London`,
    description: `Find details about ${venue.name} located in ${venue.borough}.`,
    openGraph: {
      title: venue.name,
      images: ['/static-placeholder-og.jpg'], // Deferred to Phase 6
    },
  };
}

export default async function VenuePage({ params }: { params: { slug: string } }) {
  const venue = await getVenueBySlug(params.slug);
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: venue.name,
    address: { '@type': 'PostalAddress', addressLocality: venue.borough },
    geo: { '@type': 'GeoCoordinates', latitude: venue.lat, longitude: venue.lon },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Venue UI */}
    </>
  );
}
```

### Social Sharing with Web Share API
```typescript
const handleShare = async () => {
  const shareData = {
    title: venue.name,
    text: `Check out ${venue.name} on KidSpot!`,
    url: window.location.href,
  };

  if (navigator.share && navigator.canShare(shareData)) {
    await navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(shareData.url);
    toast.success('Link copied to clipboard!');
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side Fetch | Server Components | Next.js 13+ | Zero-JS for initial render, better SEO. |
| `sitemap.xml` file | `sitemap.ts` | Next.js 13+ | Type-safe, dynamic sitemaps. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Slug Storage | ✓ | 15.3 | — |
| Next.js | Routing/SEO | ✓ | 14.2.5 | — |
| Google API | Borough Lookup | ✓ | — | Use Nominatim (Free) or hardcoded mapping. |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (Backend), Vitest (Proposed Frontend) |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| SEO-01 | Slug index exists | Migration | `psql -c "\d venues"` |
| SEO-02 | Unique slug gen | Unit Test | `jest backend/src/utils/slug.test.js` |
| SEO-04 | Metadata render | E2E/Unit | `vitest frontend/src/app/venue/page.test.tsx` |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Slug sanitization via `slugify`. |
| V12 Communications | yes | Secure Clipboard API usage. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via JSON-LD | Tampering | Use `JSON.stringify` and ensure no user-controlled strings escape the script tag. |

## Sources

### Primary (HIGH confidence)
- [Next.js Docs](https://nextjs.org/docs/app/building-your-application/optimizing/metadata) - `generateMetadata`
- [Schema.org](https://schema.org/LocalBusiness) - `LocalBusiness` types
- [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) - Web Share API support

### Tertiary (LOW confidence)
- [Borough Mapping] - Determining exact borough for existing 1,000+ venues might require reverse geocoding batch processing.

## Metadata
**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: MEDIUM

**Research date:** 2024-04-17
**Valid until:** 2024-05-17
