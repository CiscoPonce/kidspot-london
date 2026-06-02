---
phase: 18B-contact-extraction-yield-optimization-weeks-23-24
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/utils/httpHeaders.ts
  - backend/src/utils/rateLimiter.ts
  - backend/src/utils/nvidia.ts
  - backend/src/worker.ts
  - backend/scripts/discovery/sources/direct-crawl-enrichment.ts
  - backend/scripts/discovery/sources/web-scraper-enrichment.ts
  - backend/scripts/discovery/sources/enrichment.ts
  - backend/scripts/discovery/sources/overpass-utils.ts
  - backend/scripts/discovery/chain-expansion.ts
autonomous: true
requirements:
  - CE-01
  - CE-02
  - CE-03
user_setup: []
must_haves:
  truths:
    - "All outbound fetch calls across the enrichment pipeline use shared browser-grade headers"
    - "BullMQ repeating jobs invoke crawlDelay() with per-job baseMs and jitter instead of inline setTimeout"
    - "NVIDIA LLM fallback triggers only when phone IS NULL AND email IS NULL AND opening_hours IS NULL after cheerio+regex extraction"
    - "LLM response text is accumulated from chunk.choices[0].delta.reasoning / reasoning_content, not message.content"
    - "LLM-extracted fields are validated against PHONE_REGEX, EMAIL_REGEX, and JUNK_EMAIL before any DB write"
    - "No reference to OPENROUTER_API_KEY exists in any new or modified code in this phase"
  artifacts:
    - path: "backend/src/utils/httpHeaders.ts"
      provides: "Shared browserHeaders() function for all outbound HTTP fetches"
      exports: ["browserHeaders"]
    - path: "backend/src/utils/rateLimiter.ts"
      provides: "crawlDelay(baseMs) with jitter for BullMQ job scheduling"
      exports: ["crawlDelay"]
    - path: "backend/src/utils/nvidia.ts"
      provides: "callNvidia(systemPrompt, userPrompt) wrapping NVIDIA API with reasoning-token extraction"
      exports: ["callNvidia"]
      env_vars: ["NVIDIA_API_KEY", "NVIDIA_MODEL", "NVIDIA_MAX_TOKENS", "NVIDIA_TEMPERATURE", "NVIDIA_TOP_P", "NVIDIA_BASE_URL"]
    - path: "backend/src/worker.ts"
      provides: "All 10 repeating enrichment jobs wired to crawlDelay() with configured baseMs"
      contains: "crawlDelay"
    - path: "backend/scripts/discovery/sources/direct-crawl-enrichment.ts"
      provides: "LLM fallback in total-failure path + browserHeaders on fetchPage + crawlDelay replacing inline setTimeout"
      contains: ["callNvidia", "browserHeaders", "crawlDelay"]
    - path: "backend/scripts/discovery/sources/web-scraper-enrichment.ts"
      provides: "browserHeaders on Brave API and venue fetches"
      contains: "browserHeaders"
    - path: "backend/scripts/discovery/sources/enrichment.ts"
      provides: "browserHeaders on Nominatim reverse geocode fetches"
      contains: "browserHeaders"
    - path: "backend/scripts/discovery/sources/overpass-utils.ts"
      provides: "browserHeaders on Overpass API POST calls"
      contains: "browserHeaders"
    - path: "backend/scripts/discovery/chain-expansion.ts"
      provides: "browserHeaders on Apify fetch calls"
      contains: "browserHeaders"
  key_links:
    - from: "backend/src/worker.ts"
      to: "backend/src/utils/rateLimiter.ts"
      via: "crawlDelay() invoked per job processor before enrichment work begins"
      pattern: "crawlDelay\("
    - from: "backend/scripts/discovery/sources/direct-crawl-enrichment.ts"
      to: "backend/src/utils/nvidia.ts"
      via: "LLM fallback triggers only when phone IS NULL AND email IS NULL AND opening_hours IS NULL"
      pattern: "callNvidia"
    - from: "backend/scripts/discovery/sources/direct-crawl-enrichment.ts"
      to: "backend/src/utils/httpHeaders.ts"
      via: "fetchPage(url) now passes headers: browserHeaders()"
      pattern: "browserHeaders"
    - from: "backend/scripts/discovery/sources/web-scraper-enrichment.ts"
      to: "backend/src/utils/httpHeaders.ts"
      via: "Brave API + venue fetch calls now use browserHeaders()"
      pattern: "browserHeaders"
    - from: "backend/scripts/discovery/sources/enrichment.ts"
      to: "backend/src/utils/httpHeaders.ts"
      via: "Nominatim fetch now uses browserHeaders()"
      pattern: "browserHeaders"
    - from: "backend/scripts/discovery/sources/overpass-utils.ts"
      to: "backend/src/utils/httpHeaders.ts"
      via: "Overpass POST fetch merges browserHeaders() into existing Content-Type"
      pattern: "browserHeaders"
    - from: "backend/scripts/discovery/chain-expansion.ts"
      to: "backend/src/utils/httpHeaders.ts"
      via: "Apify poll/run fetches use browserHeaders()"
      pattern: "browserHeaders"

---
<objective>
Increase direct-crawl contact extraction yield by replacing inline HTTP headers and delays with shared utilities, and adding a single NVIDIA API LLM fallback call when cheerio+regex returns nothing for all three contact fields.
</objective>
<purpose>
Browser-grade headers reduce upstream rejections that strip contact data; centralized rate limiting with jitter disrupts bot-fingerprint timing; the NVIDIA LLM fallback recovers contact details from HTML that regex completely misses. Together these three levers target email coverage 8% → ≥11% and phone coverage 22% → ≥28% with zero per-venue cost.</purpose>
<output>
Three new utility modules, five modified enrichment source files, and a worker.ts wired to crawlDelay(). All acceptance criteria verified by automated checks.</output>

<execution_context>
@/home/ubuntu/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntu/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/18B-contact-extraction-yield-optimization-weeks-23-24/18B-CONTEXT.md
@backend/src/config/env.ts
@backend/src/utils/phone.ts
@backend/scripts/discovery/sources/direct-crawl-enrichment.ts
@backend/scripts/discovery/sources/web-scraper-enrichment.ts
@backend/scripts/discovery/sources/enrichment.ts
@backend/scripts/discovery/sources/overpass-utils.ts
@backend/scripts/discovery/chain-expansion.ts
@backend/src/worker.ts
</context>

<tasks>
  <task type="auto">
    <name>Task 1: Create shared utility modules and wire rateLimiter into worker.ts</name>
    <files>
      backend/src/utils/httpHeaders.ts,
      backend/src/utils/rateLimiter.ts,
      backend/src/utils/nvidia.ts,
      backend/src/worker.ts
    </files>
    <action>
Create three new utility files and update worker.ts to consume the rate limiter. For each new file, follow existing project conventions found in backend/src/utils/ (e.g., phone.ts pattern of named exports with JSDoc). Do NOT reference OPENROUTER_API_KEY in any new code. nvidia.ts must read all env vars from the schema already present in backend/src/config/env.ts:
  - NVIDIA_API_KEY, NVIDIA_MODEL (default 'stepfun-ai/step-3.7-flash'), NVIDIA_MAX_TOKENS, NVIDIA_TEMPERATURE, NVIDIA_TOP_P, NVIDIA_BASE_URL (default 'https://integrate.api.nvidia.com/v1').

Specifics per file:
  - httpHeaders.ts: export a function browserHeaders() returning a realistic Chromium-like header set (Accept, Accept-Language, Sec-Fetch-*, DNT, Upgrade-Insecure-Requests). Default User-Agent MUST remain 'KidSpot-London/1.0 (venue-enrichment; +https://kidspot.london)' to preserve attribution. The function signature should be: export function browserHeaders(extra?: Record<string, string>): Record<string, string>.
  - rateLimiter.ts: export async function crawlDelay(baseMs: number): Promise<void> that resolves after baseMs + random(-100, +150) ms jitter. Avoid tight-loop CPU burn by using setTimeout wrapped in a Promise.
  - nvidia.ts: export async function callNvidia(systemPrompt: string, userPrompt: string): Promise<string>. Build the HTTPS POST to `${env.NVIDIA_BASE_URL}/chat/completions` with header Authorization: Bearer ${env.NVIDIA_API_KEY} and JSON body { model: env.NVIDIA_MODEL, messages: [{role:'system',content:systemPrompt},{role:'user',content:userPrompt}], max_tokens: env.NVIDIA_MAX_TOKENS, temperature: env.NVIDIA_TEMPERATURE, top_p: env.NVIDIA_TOP_P, stream: false }. On response, extract the assistant text from chunk.choices[0].delta.reasoning and chunk.choices[0].delta.reasoning_content (accumulate both across streaming chunks; if non-streaming or content is null, still read reasoning/reasoning_content). Do NOT read chunk.choices[0].message.content because per CE-02 that field is always null for this model. Return the accumulated string, or throw on non-2xx.

For worker.ts: import { crawlDelay } from './utils/rateLimiter.js' at the top. Inside each repeating job processor (the switch case or the processor functions that handle enrich-direct-crawl, enrich-web-scrape, enrich-osm-contacts, enrich-osm-hours, enrich-geocode, enrich-apify, enrich-foursquare, enrich-geoapify, enrich-brave-images, contact-backfill), invoke await crawlDelay(baseMs) before calling the enrichment function. Use the baseMs values from CE-03:
  - direct-crawl / web-scrape: 1200ms
  - osm-contacts / osm-hours: 600ms
  - geocode: 400ms
  - apify: 1000ms
  - foursquare: 500ms
  - geoapify: 500ms
  - brave-images: 500ms
  - contact-backfill: 700ms
Keep all other worker.ts behavior unchanged. Preserve existing jobId, repeat patterns, and jobOpts spread exactly as they are. Only add the crawlDelay calls.
    </action>
    <verify>
      <automated>
        ls backend/src/utils/httpHeaders.ts backend/src/utils/rateLimiter.ts backend/src/utils/nvidia.ts && node -e "const h=require('./backend/src/utils/httpHeaders.ts'); console.log('headers keys:', Object.keys(h.browserHeaders()).length)" 2>&1 | grep -q 'headers keys: [7-9]' && echo PASS_HEADERS || echo FAIL_HEADERS
      </automated>
    </verify>
    <done>Three new files exist with named exports; worker.ts compiles and references crawlDelay() for all 10 job processors.</done>
  </task>

  <task type="auto">
    <name>Task 2: Replace inline fetch headers and delays with shared utilities; add NVIDIA LLM fallback to direct-crawl</name>
    <files>
      backend/scripts/discovery/sources/direct-crawl-enrichment.ts,
      backend/scripts/discovery/sources/web-scraper-enrichment.ts,
      backend/scripts/discovery/sources/enrichment.ts,
      backend/scripts/discovery/sources/overpass-utils.ts,
      backend/scripts/discovery/chain-expansion.ts
    </files>
    <action>
Modify the five enrichment source files to use the shared utilities. Do NOT add any new dependencies or fetch inline delays. Do NOT reference OPENROUTER_API_KEY anywhere.

For each file:

1. direct-crawl-enrichment.ts:
   - Import browserHeaders from '../../../src/utils/httpHeaders.js' and crawlDelay from '../../../src/utils/rateLimiter.js' and callNvidia from '../../../src/utils/nvidia.js'.
   - Replace FETCH_OPTS.headers with browserHeaders() at line 18. The fetchPage function should call fetch(url, { ...FETCH_OPTS, headers: browserHeaders() }) so the User-Agent attribution and other browser headers are merged correctly.
   - Replace the inline await new Promise((r) => setTimeout(r, 800)) at line ~161 with await crawlDelay(800).
   - Add LLM fallback logic: after the loop over CONTACT_PATHS, if phone IS NULL AND email IS NULL AND opening_hours IS NULL AND we fetched at least one HTML page (html !== null for the homepage), then construct a single userPrompt summarizing the raw HTML and call await callNvidia(systemPrompt, userPrompt). The system prompt should instruct the model to extract UK phone numbers, email addresses, and opening hours from the provided HTML, returning JSON with keys {phone, email, opening_hours} or null for missing fields. After receiving the LLM response, parse the JSON (safely), validate phone against PHONE_REGEX and isValidUkPhone from phone.ts, validate email against EMAIL_REGEX and reject if JUNK_EMAIL matches. If validation passes, assign to the local phone/email/openingHours variables so they flow into the existing COALESCE(NULLIF(...)) UPDATE block at lines 185-192. If validation fails, leave variables as null. Log a metric line when the LLM fallback fires. Cap: one call per venue per enrichment pass.
   - Remove all inline setTimeout calls in this file.

2. web-scraper-enrichment.ts:
   - Import browserHeaders from '../../../src/utils/httpHeaders.js'.
   - Replace the inline headers on Brave fetch at line 87 with headers: { ...browserHeaders(), 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_API_KEY }.
   - Find any other fetch calls (venue page fetch later in the file) and replace their headers with browserHeaders(). Do NOT replace the rate-limit sleep at line 77 with crawlDelay in this file — the Brave Search rate limit is external API-specific; only replace headers.

3. enrichment.ts:
   - Import browserHeaders from '../../../src/utils/httpHeaders.js'.
   - Replace the Nominatim fetch headers at line 37 with browserHeaders(). Nominatim requires a User-Agent per their usage policy; browserHeaders() preserves the default KidSpot User-Agent so this remains compliant.
   - Replace the inline await new Promise((resolve) => setTimeout(resolve, 1100)) at line 33 with await crawlDelay(1100) (Nominatim requires ~1s; using 1100ms base keeps compliance).

4. overpass-utils.ts:
   - Import browserHeaders from '../../../src/utils/httpHeaders.js'.
   - Replace the inline headers object in the fetch call at line 11 with { ...browserHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' } so the browser headers merge cleanly with the required POST content type.

5. chain-expansion.ts:
   - Import browserHeaders from '../../../src/utils/httpHeaders.js'.
   - Find Apify fetch calls (trigger run at line 69, poll status at line 92) and replace their headers with browserHeaders(). For the run trigger, merge with the required 'Content-Type: 'application/json'': headers: { ...browserHeaders(), 'Content-Type': 'application/json' }.

After modifications, verify no inline headers objects remain in any of these five files except where explicitly merged with extra required headers (Accept for Brave, Content-Type for POSTs).
    </action>
    <verify>
      <automated>
        bash -c 'grep -v "^//" backend/scripts/discovery/sources/direct-crawl-enrichment.ts | grep -c "setTimeout" | xargs -I{} test {} -eq 0 && echo NOSETTIMEOUT || echo HASSETTIMEOUT'
        bash -c 'grep -c "browserHeaders()" backend/scripts/discovery/sources/direct-crawl-enrichment.ts backend/scripts/discovery/sources/web-scraper-enrichment.ts backend/scripts/discovery/sources/enrichment.ts backend/scripts/discovery/sources/overpass-utils.ts backend/scripts/discovery/chain-expansion.ts | awk -F: "{s+=\\$2} END {print (s>=5)?\"PASS_HEADERS\":\"FAIL_HEADERS\"}"'
        bash -c 'grep -c "OPENROUTER_API_KEY" backend/src/utils/nvidia.ts backend/scripts/discovery/sources/direct-crawl-enrichment.ts | awk -F: "{s+=\\$2} END {print (s==0)?\"NO_OPENROUTER\":\"HAS_OPENROUTER\"}"'
      </automated>
    </verify>
    <done>All five source files use shared browserHeaders(); direct-crawl uses crawlDelay(); direct-crawl has NVIDIA fallback gated on phone+email+opening_hours all null; no OPENROUTER references remain.</done>
  </task>
</tasks>

<verification>
```bash
# 1. All listed files modified
git diff --stat --name-only | grep -E "backend/src/utils/(httpHeaders|rateLimiter|nvidia).ts|backend/src/worker.ts|backend/scripts/discovery/sources/(direct-crawl|web-scraper|enrichment|overpass-utils|chain-expansion).ts" | wc -l | xargs -I{} test {} -ge 9

# 2. Shared headers exported and consumed
grep -c "export function browserHeaders" backend/src/utils/httpHeaders.ts | xargs -I{} test {} -ge 1
grep -v '^#' backend/scripts/discovery/sources/direct-crawl-enrichment.ts backend/scripts/discovery/sources/web-scraper-enrichment.ts backend/scripts/discovery/sources/enrichment.ts backend/scripts/discovery/sources/overpass-utils.ts backend/scripts/discovery/chain-expansion.ts | grep -c "browserHeaders()" | xargs -I{} test {} -ge 5

# 3. Rate limiter exported, worker uses crawlDelay
grep -c "export async function crawlDelay" backend/src/utils/rateLimiter.ts | xargs -I{} test {} -ge 1
grep -c "crawlDelay(" backend/src/worker.ts | xargs -I{} test {} -ge 10

# 4. NVIDIA wrapper extracts from reasoning fields, not content
grep "reasoning" backend/src/utils/nvidia.ts | grep -v "reasoning_content" | wc -l | xargs -I{} test {} -ge 1
grep "reasoning_content" backend/src/utils/nvidia.ts | wc -l | xargs -I{} test {} -ge 1
grep "message.content" backend/src/utils/nvidia.ts | wc -l | xargs -I{} test {} -eq 0

# 5. Direct-crawl fallback trigger condition
grep -A2 'phone IS NULL AND email IS NULL AND opening_hours IS NULL' backend/scripts/discovery/sources/direct-crawl-enrichment.ts | wc -l | xargs -I{} test {} -ge 1

# 6. LLM response validation before DB write
grep -c "PHONE_REGEX\|EMAIL_REGEX\|JUNK_EMAIL\|isValidUkPhone" backend/scripts/discovery/sources/direct-crawl-enrichment.ts | xargs -I{} test {} -ge 3

# 7. No OPENROUTER references in new code
grep -r "OPENROUTER_API_KEY" backend/src/utils/ backend/scripts/discovery/sources/ | wc -l | xargs -I{} test {} -eq 0

# 8. Zero inline setTimeout in direct-crawl
grep -v '^//' backend/scripts/discovery/sources/direct-crawl-enrichment.ts | grep -c "setTimeout" | xargs -I{} test {} -eq 0

# 9. Typecheck passes
cd backend && npx tsc --noEmit

# 10. Env var names match schema
grep "NVIDIA_" backend/src/utils/nvidia.ts | sed 's/.*env\.//' | sed 's/[^A-Z_0-9].*//' | sort -u > /tmp/nvidia_vars.txt
grep "NVIDIA_" backend/src/config/env.ts | sed 's/.*z\.//' | sed 's/[^A-Z_0-9].*//' | sort -u > /tmp/env_schema_vars.txt
diff /tmp/nvidia_vars.txt /tmp/env_schema_vars.txt | wc -l | xargs -I{} test {} -eq 0
```

</verification>

<success_criteria>
- Email coverage rises from 8% to ≥11% and phone coverage from 22% to ≥28% within two pipeline-evaluation windows, confirmed by before/after SQL queries against the venues table.
- All outbound fetch calls across the enrichment pipeline use browserHeaders().
- rateLimiter.ts is the single source of truth for crawl delays; worker.ts references crawlDelay() for all 10 repeating job processors.
- NVIDIA LLM fallback fires at most once per venue per enrichment pass, gated on phone IS NULL AND email IS NULL AND opening_hours IS NULL.
- No reference to OPENROUTER_API_KEY exists in any new or modified code.
- backend/src/worker.ts and all enrichment scripts pass tsc --noEmit.
- git diff --stat shows all 9 listed files modified.
</success_criteria>

<output>
Create `.planning/phases/18B-contact-extraction-yield-optimization-weeks-23-24/18B-01-SUMMARY.md` when done.
</output>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Enrichment worker → External venue websites | Untrusted HTML crosses here; headers reduce rejection but do not authenticate origin |
| Enrichment worker → NVIDIA API | LLM response ingested as data; must be validated before DB write |
| Enrichment worker → Overpass / Brave / Apify | Third-party API keys and tokens transmitted over HTTPS |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-18B-01 | Spoofing | Venue HTML response | mitigate | Validate all LLM-extracted fields against PHONE_REGEX, EMAIL_REGEX, and JUNK_EMAIL before write; reject mismatches |
| T-18B-02 | Tampering | In-flight fetch to venue sites | mitigate | Enforce HTTPS-only with browserHeaders (Upgrade-Insecure-Requests, DNT, Sec-Fetch-*) |
| T-18B-03 | Information Disclosure | NVIDIA API key in transit | mitigate | nvidia.ts sends NVIDIA_API_KEY only in Authorization Bearer header over HTTPS to integrate.api.nvidia.com; never logs env |
| T-18B-04 | Denial of Service | Upstream firewall blocks | mitigate | browserHeaders() reduces 403/406 rejections; crawlDelay() jitter disrupts timing fingerprint; exponential backoff already present in overpass-utils |
| T-18B-SC | Tampering | npm/pip/cargo installs | accept | No new packages introduced in this phase; existing dependency set unchanged |
</threat_model>
