# Phase 18B: Contact Extraction Yield Optimization

## Objective
Increase the contact data extraction yield of the existing direct-crawl pipeline by ~30% through two low-cost changes: (1) browser-grade HTTP headers to bypass basic bot detection, and (2) an OpenRouter LLM fallback for pages where cheerio+regex returns nothing. Add a BullMQ queue rate limiter to reduce upstream firewall blocks.

**Metrics (baseline → target):**
- Email coverage: 1,216 / 14,676 active = 8.3% → 11%+
- Phone coverage: 3,191 / 14,676 active = 21.7% → 28%+
- `contact_backfill_success_rate` (venues returning at least one contact field) from current ~15% → 20%+

## Key Files & Context
- `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` — Layer 2b contact crawl; uses cheerio + regex; sends `User-Agent: KidSpot-London/1.0`
- `backend/scripts/discovery/sources/web-scraper-enrichment.ts` — Layer 2 web scrape for booking URLs/emails; same minimal headers
- `backend/src/config/env.ts` — `OPENROUTER_API_KEY` is declared (line 18) but **never imported or used** anywhere in the codebase
- `backend/src/worker.ts` — BullMQ worker setup (line 24); discovery queue has no `limiter` config; `jobOpts` (line 26) has backoff but no per-queue rate cap
- `backend/src/utils/phone.ts` — Phone normalization utilities already in place
- `backend/src/services/venueService.ts:159` — Other services use `User-Agent: KidSpotLondon/1.0` (slightly different string)

## Implementation Steps

### 1. Browser-Grade Header Spoofing
**Goal**: Replace the single `User-Agent` header with a full browser fingerprint that passes Cloudflare/Akamai "JS challenge" heuristics.

**Change in `direct-crawl-enrichment.ts`** (lines 18–22):
```typescript
const getStandardizedHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.google.co.uk/',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'cross-site',
  'Sec-Fetch-User': '?1',
});

const FETCH_OPTS = {
  headers: getStandardizedHeaders(),
  signal: AbortSignal.timeout(12000),
  redirect: 'follow' as const,
};
```

**Change in `web-scraper-enrichment.ts`** (lines 84–91, 131–134, 177–180):
Apply `getStandardizedHeaders()` to all three `fetch()` calls (Brave API, websiteUrl, `/contact` page).

**Change in `enrichment.ts`** (lines 36–38) and `overpass-utils.ts` (lines 9–14):
Apply `getStandardizedHeaders()` to Nominatim and Overpass fetches. (Nominatim's UA policy allows descriptive strings; the full header set is harmless there.)

**Change in `venueService.ts:159` and `operatorService.ts:258`**:
Replace `'User-Agent': 'KidSpotLondon/1.0'` with `getStandardizedHeaders().User-Agent` for consistency.

Create a shared utility: **`backend/src/utils/httpHeaders.ts`** exporting `getStandardizedHeaders()` so all callers import from one place instead of duplicating.

### 2. LLM Fallback Extraction (OpenRouter)
**Goal**: When cheerio+regex finds no email or phone, send cleaned HTML text to OpenRouter and parse the response as strict JSON.

**New file: `backend/scripts/discovery/sources/llm-enrichment.ts`**

```typescript
import { env } from '../../src/config/env.js';

export interface LLMContactResult {
  email: string | null;
  phone: string | null;
}

export async function extractContactLLM(cleanText: string): Promise<LLMContactResult | null> {
  if (!env.OPENROUTER_API_KEY) return null;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kidspot.london',
        'X-Title': 'KidSpot London Enrichment',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct',
        response_format: { type: 'json_object' },
        max_tokens: 150,
        messages: [
          { role: 'system', content: 'You are a contact extractor. Return strict JSON: {"email": "..." , "phone": "..."}. Use null for missing fields. UK phone numbers start with 0 or +44. Never invent data.' },
          { role: 'user', content: cleanText },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`LLM extraction failed (${response.status}): ${errText}`);
      return null;
    }

    const json = await response.json();
    const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}');
    return {
      email: parsed.email && typeof parsed.email === 'string' ? parsed.email : null,
      phone: parsed.phone && typeof parsed.phone === 'string' ? parsed.phone : null,
    };
  } catch (err) {
    console.warn('LLM extraction error:', err);
    return null;
  }
}
```

**Integration into `direct-crawl-enrichment.ts`:**
- After cheerio+regex extraction (line ~93), if both `email` and `phone` are still null:
  1. Load HTML, strip tags (`script, style, noscript, iframe, img, svg`), truncate to 4000 chars
  2. Call `extractContactLLM(cleanedText)`
  3. If LLM returns a value, validate it with existing `PHONE_REGEX` / `EMAIL_REGEX` before persisting
- Gate: only fire LLM fallback if the page returned HTTP 200 and content-type is HTML
- Cost guard: skip LLM if venue already has email OR phone (don't pay for half-filled venues)
- Failure tracking: increment `stats.llm_failed` in result object

**New entry in `phase-18b-enrichment.ts`** (new script file, similar to `contact-backfill.ts`):
```typescript
export async function runContactLLMBackfill(batchSize: number = 50) {
  // Query: active venues, website NOT NULL, email IS NULL, phone IS NULL,
  //        website_crawl_enriched_at IS NOT NULL (already crawled at least once)
  // For each: re-fetch homepage with new headers, run cheerio+regex+LLM fallback
}
```

Register as repeating job in `worker.ts`:
```typescript
await discoveryQueue.add('enrich-contact-llm', { batchSize: 50 }, {
  repeat: { pattern: '0 8 * * *' }, // daily at 08:00, after contact-backfill at 07:00
  jobId: 'repeat:enrich-contact-llm',
  ...jobOpts,
});
```

Add case handler in worker switch block (after `contact-backfill`).

### 3. BullMQ Rate Limiter
**Goal**: Reduce upstream firewall blocks by capping per-queue concurrency at the BullMQ level (belt-and-suspenders alongside the existing 800ms in-job throttle).

**Change in `worker.ts` line 24:**
```typescript
const discoveryQueue = new Queue('discovery', {
  connection: redis,
  defaultJobOptions: {
    ...jobOpts,
    limits: { maxJobSize: 1000 }, // optional: cap memory per job payload
  },
});
```

**Add to `worker.ts` worker instantiation** (around line 121–140):
```typescript
const worker = new Worker('discovery', handlerFn, {
  connection: redis,
  concurrency: 1,
  limiter: {
    max: 5,
    duration: 1000, // max 5 jobs/sec across the entire queue
  },
  stalledInterval: 30000,
});
```

**In `direct-crawl-enrichment.ts`** (line ~161): reduce 800ms delay to 400ms since the queue limiter now handles pacing. Monitor `enrich-direct-crawl` failure rate for 2 weeks after deploy; increase duration back to 800ms if upstream 429s spike.

### 4. Verification & Testing
1. **Pre/post coverage query** (run before and after the pipeline processes 500 venues):
   ```sql
   SELECT
     count(*) FILTER (WHERE email IS NOT NULL AND email != '') as with_email,
     count(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as with_phone,
     count(*) FILTER (WHERE website_crawl_enriched_at > NOW() - INTERVAL '7 days') as recently_crawled
   FROM venues WHERE is_active = TRUE;
   ```
2. **Log-based success rate**: add `stats.llm_success` counter; target ≥ 5% of LLM-attempted venues return a valid contact field.
3. **Header regression**: curl one venue website with old vs new headers; confirm 403/block rate drops.
4. **Rate limiter validation**: check BullMQ `waiting` + `active` counts stay under concurrency boundary under load.

## Files Changed
| File | Change |
|------|--------|
| `backend/src/utils/httpHeaders.ts` | **New** — exported `getStandardizedHeaders()` |
| `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` | Import + use new headers; add LLM fallback branch |
| `backend/scripts/discovery/sources/web-scraper-enrichment.ts` | Use new headers |
| `backend/scripts/discovery/sources/enrichment.ts` | Use new headers |
| `backend/scripts/discovery/sources/overpass-utils.ts` | Use new headers |
| `backend/scripts/discovery/sources/llm-enrichment.ts` | **New** — OpenRouter fallback extractor |
| `backend/scripts/discovery/sources/phase-18b-enrichment.ts` | **New** — daily LLM-backfill job script |
| `backend/src/services/venueService.ts` | Use new headers User-Agent |
| `backend/src/services/operatorService.ts` | Use new headers User-Agent |
| `backend/src/worker.ts` | Add `enrich-contact-llm` repeating job; add queue limiter |

## Dependencies
- `OPENROUTER_API_KEY` env var must be set (already defined in `env.ts`; needs a valid key in production `.env`)
- No new npm packages required (uses native `fetch`, existing `cheerio`, existing `bullmq`)

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| OpenRouter rate limits or latency | Timeout at 15s; fail-open (return null, skip venue); daily batch of 50 is well within free-tier limits |
| Still blocked by Cloudflare full challenge | Headers bypass basic WAF; full JS challenge needs proxy rotation (deferred to Phase 19 if needed) |
| LLM hallucinates contacts | Strict JSON schema + regex validation + never-invent system prompt; only accepted if it passes both email and phone regex |
| Cost | Llama-3-8B via OpenRouter ≈ $0.0005/1k tokens; 50 venues/day × 4k chars ≈ $0.001/day — negligible |
