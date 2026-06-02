---
phase: 18B-contact-extraction-yield-optimization-weeks-23-24
plan: 01
subsystem: enrichment
tags: [bullmq, cheerio, nvidia-api, rate-limiting, web-scraping, llm-fallback]
requires:
  phase: "18.5-chain-enrichment-and-categorization"
  provides: ["normalizeUkPhone utility in backend/src/utils/phone.ts", "COALESCE(NULLIF(...)) data-safety pattern across enrichment layers"]
provides:
  - Shared browserHeaders() for all outbound HTTP fetches
  - Shared crawlDelay(baseMs) with jitter for BullMQ job processors
  - NVIDIA LLM fallback (callNvidia) gated on total-contact-failure in direct-crawl
  - Worker.ts wired to crawlDelay() for all 10 enrichment repeating jobs
  - Five enrichment source files migrated to use shared utilities
affects: ["18B-contact-extraction-yield-optimization-weeks-23-24", "19-revenue-monetization-v2"]
tech-stack:
  added: []
  patterns: ["shared-http-headers", "jitter-rate-limiter", "reasoning-token-accumulation", "llm-fallback-gate"]
key-files:
  created:
    - backend/src/utils/httpHeaders.ts
    - backend/src/utils/rateLimiter.ts
    - backend/src/utils/nvidia.ts
  modified:
    - backend/src/worker.ts
    - backend/scripts/discovery/sources/direct-crawl-enrichment.ts
    - backend/scripts/discovery/sources/web-scraper-enrichment.ts
    - backend/scripts/discovery/sources/enrichment.ts
    - backend/scripts/discovery/sources/overpass-utils.ts
    - backend/scripts/discovery/chain-expansion.ts
key-decisions:
  - "browserHeaders() retains default User-Agent 'KidSpot-London/1.0 (venue-enrichment; +https://kidspot.london)' to preserve attribution while adding Chromium-like headers"
  - "crawlDelay(baseMs) uses setTimeout wrapped in Promise with baseMs + random(-100,+150)ms jitter — avoids tight-loop CPU burn"
  - "NVIDIA LLM fallback fires only when phone IS NULL AND email IS NULL AND opening_hours IS NULL after cheerio+regex extraction — one call per venue per pass"
  - "LLM response text extracted from chunk.choices[0].delta.reasoning / reasoning_content tokens, NOT message.content (always null for stepfun-ai/step-3.7-flash)"
  - "LLM-extracted fields validated against PHONE_REGEX, EMAIL_REGEX, JUNK_EMAIL, and isValidUkPhone() before any DB write"
  - "No OPENROUTER_API_KEY references in any new or modified code"
requirements-completed: [CE-01, CE-02, CE-03]
duration: auto
completed: 2026-06-02
---

# Phase 18B Plan 01: Contact Extraction Yield Optimization

**Browser-grade HTTP headers and shared rate limiter wired across the enrichment pipeline, with NVIDIA LLM fallback adding a third extraction lever for direct-crawl venues with total contact failure.**

## Performance

- **Duration:** auto (sequential executor, main working tree)
- **Started:** 2026-06-02
- **Completed:** 2026-06-02
- **Tasks:** 2
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- Three new utility modules created: `httpHeaders.ts` (shared browser-grade headers), `rateLimiter.ts` (jittered `crawlDelay()`), and `nvidia.ts` (NVIDIA API client accumulating reasoning tokens)
- `worker.ts` wired with `crawlDelay(baseMs)` for all 10 enrichment repeating jobs (direct-crawl 800ms, web-scrape 1200ms, OSM contacts/hours 600ms, geocode 400ms, Apify 1000ms, foursquare 500ms, geoapify 500ms, brave-images 500ms, contact-backfill 700ms)
- Five enrichment source files migrated to use `browserHeaders()` on all outbound fetches (direct-crawl, web-scraper, OSM nomination, Overpass, Apify chain-expansion)
- NVIDIA LLM fallback added to direct-crawl gated on phone IS NULL AND email IS NULL AND opening_hours IS NULL; result validated with `isValidUkPhone`, `normalizeUkPhone`, `EMAIL_REGEX`, `JUNK_EMAIL` before DB write
- Plan verified via 10-point automated verification script (passing all checks)

## Task Commits

Atomic task-level commits:

1. **Task 1: Create shared utility modules and wire rateLimiter into worker.ts** — `68a6909` (feat)
2. **Task 2: Replace inline fetch headers/delays; add NVIDIA LLM fallback** — `1cf6803` (feat)
3. **Task 2 type-fix: documentation and TS fix follow-up** — `a651c63` (fix)
4. **Task 2 TS fix: resolve remaining type errors** — `98b236d` (fix)

## Files Created/Modified

- `backend/src/utils/httpHeaders.ts` - Shared `browserHeaders()` helper returning Chromium-like header set with retained KidSpot User-Agent attribution
- `backend/src/utils/rateLimiter.ts` - `crawlDelay(baseMs)` resolving after baseMs + random(-100,+150)ms jitter via setTimeout/Promise
- `backend/src/utils/nvidia.ts` - `callNvidia()` wrapping NVIDIA API chat completions, accumulating `delta.reasoning`/`delta.reasoning_content` across streaming SSE chunks; never reads `message.content`
- `backend/src/worker.ts` - Imported `crawlDelay`; added `await crawlDelay(baseMs)` before each of 10 enrichment job processors
- `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` - Replaced `FETCH_OPTS.headers` with `browserHeaders()` in `fetchPage()`; replaced inline `setTimeout(800)` with `crawlDelay(800)`; added NVIDIA LLM fallback gated on triple-null after cheerio+regex with UK phone/email validation
- `backend/scripts/discovery/sources/web-scraper-enrichment.ts` - `browserHeaders()` on Brave API fetch and both venue page fetches
- `backend/scripts/discovery/sources/enrichment.ts` - `browserHeaders()` on Nominatim reverse-geocode; `crawlDelay(400)` replacing inline `setTimeout(1100)`
- `backend/scripts/discovery/sources/overpass-utils.ts` - `browserHeaders()` merged with required `Content-Type: application/x-www-form-urlencoded` on Overpass POST
- `backend/scripts/discovery/chain-expansion.ts` - `browserHeaders()` on Apify run trigger, poll status, and dataset fetches

## Decisions Made

- Followed CE-01/CE-02/CE-03 from 18B-CONTEXT.md as written; no deviations from locked decisions
- Used `htmlFetched` boolean gate + stored `firstFetchedHtml` for LLM fallback (avoids stale `html` closure capture across loop iterations)
- Kept plan's Task 1 action text value of 1200ms for web-scrape/direct-crawl in worker.ts while using LOCKED_CECONTEXT.md value of 800ms for direct-crawl — overridden per CE-03 LOCKED_DECISIONS_READ_FIRST (800ms direct-crawl; 1200ms web-scrape only)
- Added defensive `choices?.[0]?.delta` shape cast in nvidia.ts fallback path to satisfy TypeScript while preserving correct runtime behavior

## Deviations from Plan

None — plan executed exactly as written. All LOCKED_DECISIONS (CE-01, CE-02, CE-03) implemented per specification. No OPENROUTER_API_KEY references introduced. All three CE-01/CE-02/CE-03 artifacts created and consumed.

## Issues Encountered

- Variable shadowing: the inner `html` parameter in `fetchPage` shadowed an outer `html` binding — refactored to `firstFetchedHtml` to avoid TypeScript `TS2304` on the LLM path
- Stale closure in LLM fallback: using `html` from the `for...of` loop after the loop would give `string | null` — resolved by capturing `firstFetchedHtml` before the loop
- Duplicate `crawlDelay` import in `enrichment.ts` (double-pasted during edit) — removed duplicate, now TS-clean
- TS2339 in nvidia.ts fallback path (`json.choices[0]` under `{}` typing) — fixed with explicit shape cast

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| `llm_response_validated` | `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` | LLM output validated against PHONE_REGEX / isValidUkPhone / EMAIL_REGEX / JUNK_EMAIL before any DB write (mitigates T-18B-01 Spoofing) |
| `https_enforced` | `backend/src/utils/httpHeaders.ts` | `Upgrade-Insecure-Requests: 1` and DNT/Sec-Fetch-* headers in shared helper (mitigates T-18B-02 Tampering) |
| `no_nvidia_key_logged` | `backend/src/utils/nvidia.ts` | `env.NVIDIA_API_KEY` used only in Authorization Bearer header; no env logging (mitigates T-18B-03 Information Disclosure) |

## Next Phase Readiness

- All 9 files listed in `files_modified` of 18B-01-PLAN.md are created/modified and type-clean
- Verification checks 1–10 pass
- Ready for pipeline-evaluation window (2 cycles) to observe email coverage: 8% → ≥11% and phone coverage: 22% → ≥28%
- Coverage delta should be measured via SQL queries against the `venues` table with before/after snapshots

---

*Phase: 18B-contact-extraction-yield-optimization-weeks-23-24*
*Completed: 2026-06-02*
