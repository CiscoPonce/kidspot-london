# Phase 18B: Contact Extraction Yield Optimization

## Domain

Increase the contact extraction yield of the direct-crawl enrichment pipeline by ~30%
through three implementation levers: browser-grade HTTP headers (CE-01), NVIDIA API LLM
fallback extraction (CE-02), and a shared BullMQ-compatible rate limiter (CE-03) — without
adding new infrastructure or per-venue cost concerns.

## Prior Decisions From Earlier Phases

- **Phase 14**: Zero-cost OSINT strategy — bypass Google Places, use OSM + Brave +
  Cheerio stack.
- **Phase 17**: Apify actor + async webhooks + `COALESCE(NULLIF(...))` data-safety
  pattern across all enrichment layers.
- **Phase 18**: OpenRouter previously configured; **Phase 18B replaces with NVIDIA API**
  (free tier endpoint).  OPENROUTER_API_KEY env var no longer needed for this phase.
- **Phase 18**: `normalizeUkPhone()` utility already available at
  `backend/src/utils/phone.ts`.
- **Phase 18 / STATE.md**: Contact backfill worker runs daily at 07:00; autonomous engine
  already active.  Contact coverage at time of discussion: email 8%, phone 22% across
  16,844 venues.

## Implementation Decisions

### CE-01 — Browser-Grade Header Spoofing

- **Scope:** All outbound HTTP fetch calls across the entire enrichment pipeline:
  `direct-crawl-enrichment`, `web-scraper-enrichment`, OSM (Overpass), Foursquare,
  Brave Search API, Geoapify, and Apify client calls.
- **Implementation approach:** Extract a shared `browserHeaders()` helper in
  `backend/src/utils/httpHeaders.ts` that returns a header set mimicking a real
  Chromium browser (Accept, Accept-Language, Sec-Fetch-* family, DNT, Upgrade-Insecure).
  Default `User-Agent` kept as `KidSpot-London/1.0 (venue-enrichment; +https://kidspot.london)`
  to preserve attribution.
- **References:**
  - `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` (line 18 — current
    single `User-Agent` header)
  - `backend/scripts/discovery/sources/web-scraper-enrichment.ts` (line 131 — same pattern)
  - `backend/scripts/discovery/sources/osm-discovery.ts`
  - `backend/scripts/discovery/sources/enrichment.ts` (line 36)

### CE-02 — LLM Fallback Extraction via NVIDIA API

- **Provider:** NVIDIA API — free tier endpoint. No cost constraint.
- **Trigger condition:** Total failure only — all of `phone`, `email`, and
  `opening_hours` are null after cheerio+regex extraction succeeds on the HTML.
  Partial failure (one field present) does not trigger the LLM.
- **Cost/safety guardrails:** Limit to one LLM call per venue per enrichment pass.
  If both the homepage and `/contact` page return non-null HTML but yield zero extracted
  fields, a single NVIDIA API call summarises the raw HTML and fills missing fields.
  Result fields are validated against existing regex patterns (PHONE_REGEX, EMAIL_REGEX,
  JUNK_EMAIL filter) before writing to DB.
- **Configuration:** New env var `NVIDIA_API_KEY` and `NVIDIA_MODEL` (default set by
  infra).  Loaded via `backend/src/config/env.ts`.
- **References:**
  - `backend/scripts/discovery/sources/direct-crawl-enrichment.ts`
    (`extractFromHtml()` and `enrichViaDirectCrawl()`)
  - `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` (lines 170–204 —
    loop over `CONTACT_PATHS`, `COALESCE(NULLIF(...))` write block)
  - `backend/src/utils/phone.ts` (`normalizeUkPhone()`)
  - `backend/src/config/env.ts` (env var loading)

### CE-03 — BullMQ Queue Rate Limiter

- **Design:** Shared utility `backend/src/utils/rateLimiter.ts`.
- **Interface:** Export `crawlDelay(baseMs: number): Promise<void>` — resolves after
  `baseMs + random(-100, +150)` ms jitter to disrupt bot-fingerprint timing patterns.
- **Central configuration (in `worker.ts` `setupRepeatingJobs`):**
  - `enrich-direct-crawl`: base 800 ms
  - `enrich-web-scrape`: base 1200 ms
  - `enrich-osm-contacts`: base 600 ms
  - `enrich-osm-hours`: base 600 ms
  - `enrich-geocode`: base 400 ms
  - `enrich-apify`: base 1000 ms (Apify actor runner, conservative)
  - `enrich-foursquare`: base 500 ms
  - `enrich-geoapify`: base 500 ms
  - `enrich-brave-images`: base 500 ms
  - `contact-backfill`: base 700 ms
- **Upgrade path:** Replaces the inline `await new Promise(r => setTimeout(r, 800))`
  (line 160–161 of `direct-crawl-enrichment.ts`) with a call to `crawlDelay(800)`.
- **References:**
  - `backend/src/worker.ts` (lines 33–113 — `setupRepeatingJobs`)
  - `backend/scripts/discovery/sources/direct-crawl-enrichment.ts`
    (line 160–161 — current inline delay)

## Success Criteria

- Email coverage rises from 8% → ≥ 11% and phone coverage from 22% → ≥ 28% within
  two pipeline-evaluation windows (confirmed via before/after SQL queries).
- No new per-venue cost incurred (NVIDIA free tier).
- All outbound fetch calls use the shared header helper.
- Rate limiter centralised in one file; job delays configurable from `worker.ts`.

## Canonical References

- `.planning/ROADMAP.md` — Phase 18B requirements
- `.planning/STATE.md` — active phase, env vars, current yield stats
- `backend/src/utils/phone.ts` — `normalizeUkPhone()` (tel normalisation)
- `backend/src/config/env.ts` — env var loading pattern
- `backend/src/worker.ts` — BullMQ job registration; target for rate-limiter config
- `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` — current fetch + delay
  implementation
- `backend/scripts/discovery/sources/web-scraper-enrichment.ts` — current fetch pattern
- `backend/scripts/discovery/sources/enrichment.ts` — generic fetch pattern
- `backend/scripts/discovery/chain-expansion.ts` — Apify fetch pattern
- `backend/scripts/discovery/source*/overpass-utils.ts` — OSM fetch pattern

## Deferred Ideas

- Scope creep redirected: no new data sources or pipeline layers in this phase.
  Propose Phase 19 features there.
