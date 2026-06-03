---
phase: 18D-party-data-extraction-weeks-25-26
plan: 01
type: execute
wave: 1
depends_on: [18B-contact-extraction-yield-optimization-weeks-23-24]
files_modified:
  - backend/db/migrations/026_add_party_data.sql
  - backend/src/utils/partyExtraction.ts
  - backend/scripts/discovery/sources/direct-crawl-enrichment.ts
  - backend/src/worker.ts
autonomous: true
requirements:
  - DATA-PARTY-01
  - DATA-PARTY-02
  - DATA-PARTY-03
  - DATA-PARTY-04
user_setup:
  - "Confirm NVIDIA_* env is present for the worker (already wired in 18B/docker-compose)"
  - "Approve the party extraction running ahead of / alongside 18C (it is the data spine 18C renders)"
must_haves:
  truths:
    - "venues has nullable party columns: party_capable, party_price_from, party_price_unit, party_max_capacity, party_packages, party_enquiry_url, party_source, party_extracted_at"
    - "A party extractor turns crawled page text into strict validated JSON (hosts_parties, price_from, price_unit, max_capacity, packages, enquiry_url)"
    - "Extraction reuses the 18B non-streaming NVIDIA call + JSON-block extraction; a cheerio/regex pre-pass runs first to save LLM calls"
    - "Extracted values are validated (price 1-1000, capacity 1-1000, enquiry_url http(s)) before write; invalid values are discarded"
    - "Writes use COALESCE/NULLIF so a verified field is never overwritten by null/empty"
    - "A repeatable BullMQ job enrich-party-data targets party-eligible venues with a website and crawl-delays between requests"
    - "Coverage is queryable so 18C knows which party fields are populated per category"
  artifacts:
    - path: "backend/db/migrations/026_add_party_data.sql"
      provides: "Nullable party_* columns on venues + partial index on party_capable"
    - path: "backend/src/utils/partyExtraction.ts"
      provides: "extractPartyData(pageText) -> validated party JSON via regex pre-pass + NVIDIA fallback"
      exports: ["extractPartyData"]
    - path: "backend/src/worker.ts"
      provides: "Repeatable enrich-party-data job with crawl delay"
      contains: ["enrich-party-data"]
  key_links:
    - from: "backend/scripts/discovery/sources/direct-crawl-enrichment.ts"
      to: "backend/src/utils/partyExtraction.ts"
      via: "crawl flow calls the party extractor on party-eligible venues"
      pattern: "extractPartyData"
    - from: "backend/src/utils/partyExtraction.ts"
      to: "backend/src/utils/nvidia.ts"
      via: "LLM fallback for party extraction"
      pattern: "callNvidia"
    - from: "backend/src/worker.ts"
      to: "backend/scripts/discovery/sources/direct-crawl-enrichment.ts"
      via: "enrich-party-data job invokes the party extraction pass"
      pattern: "enrich-party-data"
---

<purpose>
Give KidSpot the data its PRIMARY job needs. Today the party-capable categories have 0%
booking links, ~0% party pricing, and no party-capability flag at all. This plan extends
the Phase 18B enrichment engine (browser-grade crawl + NVIDIA LLM fallback) with a
party-focused extraction pass that fills party_capable, price-per-child, capacity, package
names, and an enquiry/booking link for the ~4,400 party-eligible venues that have a website.
It is the data spine Phase 18C renders, so it runs FIRST/parallel. Backend-only.
</purpose>

<sequencing>
- Wave 1 lands schema + extractor + crawl wiring + worker job, then backfills the
  website-bearing eligible venues (softplay 100% web, leisure 92%, community halls 20%).
- Community halls without websites are routed to the existing 18B contact pipeline so the
  frontend at least has a phone/enquiry path (DATA-PARTY-04).
Sequence ahead of or in parallel with 18C; 18C degrades honestly until coverage lands.
</sequencing>

<tasks>

  <task>
    <name>Wave 1 — Schema, party extractor, crawl wiring, worker job, backfill</name>
    <requirements>DATA-PARTY-01, DATA-PARTY-02, DATA-PARTY-03, DATA-PARTY-04</requirements>
    <steps>
      1. Migration 026_add_party_data.sql: add nullable columns party_capable BOOLEAN, party_price_from NUMERIC(8,2), party_price_unit TEXT, party_max_capacity INTEGER, party_packages JSONB, party_enquiry_url TEXT, party_source TEXT, party_extracted_at TIMESTAMPTZ; add `CREATE INDEX ... ON venues (party_capable) WHERE party_capable IS TRUE`. Apply via the project's migration runner (psql in order).
      2. Create backend/src/utils/partyExtraction.ts `extractPartyData(pageText, { signal })`: (a) a cheerio/regex pre-pass detecting party signals ("party", "parties", "£X per child", capacity/"up to N", "book a party"); (b) NVIDIA fallback via callNvidia with a strict-JSON party prompt, reusing the /\{[\s\S]*\}/ extraction; (c) validate (price 1-1000, capacity 1-1000, enquiry_url http(s) absolute/same-domain) and return a typed result with nulls for anything not confidently found.
      3. Extend direct-crawl-enrichment.ts: for party-eligible types (softplay, community_hall, leisure_centre, museum, cafe) with a website, run extractPartyData on the crawled text and UPSERT party columns with COALESCE/NULLIF (never overwrite verified data with null/empty); set party_source and party_extracted_at.
      4. worker.ts: register a repeatable `enrich-party-data` job (crawlDelay between requests) selecting party-eligible venues with a website where party_extracted_at IS NULL OR < NOW() - interval '30 days'. Route community halls WITHOUT a website to the existing 18B OSM/contact enrichment (DATA-PARTY-04).
      5. Backfill: run the job over the ~4,400 website-bearing eligible venues; capture an ETA against the crawl-delay budget (as in 18B).
    </steps>
    <verify>
      <automated>
        cd backend && npx tsc --noEmit
        # schema present
        bash -c 'grep -Ec "party_capable|party_price_from|party_max_capacity|party_enquiry_url" db/migrations/026_add_party_data.sql | xargs -I{} test {} -ge 4 && echo PASS_SCHEMA || echo FAIL_SCHEMA'
        # extractor + LLM reuse
        bash -c 'grep -c "extractPartyData" src/utils/partyExtraction.ts | xargs -I{} test {} -ge 1 && echo PASS_EXTRACTOR || echo FAIL_EXTRACTOR'
        bash -c 'grep -c "callNvidia" src/utils/partyExtraction.ts | xargs -I{} test {} -ge 1 && echo PASS_LLM || echo FAIL_LLM'
        # wired into crawl + worker job
        bash -c 'grep -c "extractPartyData" scripts/discovery/sources/direct-crawl-enrichment.ts | xargs -I{} test {} -ge 1 && echo PASS_WIRED || echo FAIL_WIRED'
        bash -c 'grep -c "enrich-party-data" src/worker.ts | xargs -I{} test {} -ge 1 && echo PASS_JOB || echo FAIL_JOB'
        npm test -- partyExtraction 2>&1 | tail -10
      </automated>
      <manual>
        Apply 026 in the DB; SELECT shows the new columns. Run the extractor against 5-10 known softplay sites (e.g. a Flip Out branch): party_capable=true with a plausible price_from/capacity/enquiry_url that match the page; a known non-party venue returns party_capable=false/null. Re-running does not clobber populated values.
      </manual>
    </verify>
    <done>party_* columns exist; extractPartyData validates and returns typed party JSON via regex+LLM; crawl flow + enrich-party-data job populate party data with COALESCE/NULLIF safety; backfill running with a tracked ETA; community halls without sites routed to contact enrichment.</done>
  </task>

</tasks>

<verification>
```bash
cd backend
npx tsc --noEmit
npm test -- partyExtraction

# schema
grep -Ec "party_capable|party_price_from|party_max_capacity|party_enquiry_url" db/migrations/026_add_party_data.sql | xargs -I{} test {} -ge 4

# extractor reuses 18B NVIDIA client; wired into crawl + worker
grep -c "callNvidia" src/utils/partyExtraction.ts | xargs -I{} test {} -ge 1
grep -c "extractPartyData" scripts/discovery/sources/direct-crawl-enrichment.ts | xargs -I{} test {} -ge 1
grep -c "enrich-party-data" src/worker.ts | xargs -I{} test {} -ge 1

# coverage check (run against the DB after backfill)
# SELECT type,
#   ROUND(100.0*COUNT(*) FILTER (WHERE party_capable IS NOT NULL)/COUNT(*)) AS capability_known,
#   ROUND(100.0*COUNT(*) FILTER (WHERE party_price_from IS NOT NULL)/NULLIF(COUNT(*) FILTER (WHERE party_capable),0)) AS price_of_capable,
#   ROUND(100.0*COUNT(*) FILTER (WHERE COALESCE(party_enquiry_url,booking_url) IS NOT NULL)/NULLIF(COUNT(*) FILTER (WHERE party_capable),0)) AS link_of_capable
# FROM venues WHERE is_active AND type IN ('softplay','community_hall','leisure_centre','museum','cafe') GROUP BY type;
```
</verification>

<success_criteria>
- party_capable determined for >=80% of softplay and >=60% of leisure_centre/community_hall that have websites.
- party_price_from for >=40% of party-capable softplay; party_enquiry_url or booking_url for >=50% of party-capable venues.
- Spot-check confirms extracted price/capacity/booking match source pages; validation rejects out-of-range values; no hallucinated data written.
- COALESCE/NULLIF prevents overwriting verified fields with null/empty; tsc --noEmit + enrichment tests pass.
- enrich-party-data clears the ~4,400 website-bearing eligible venues within the crawl-delay budget (ETA tracked).
</success_criteria>

<output>
Create `.planning/phases/18D-party-data-extraction-weeks-25-26/18D-01-SUMMARY.md` when done.
Record per-category party-field coverage in STATE.md so Phase 18C can render honestly against live coverage.
</output>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Crawled third-party HTML <-> extractor | Untrusted page content fed to regex + LLM |
| LLM output <-> database | Model output must be validated before persistence |
| Worker <-> upstream venue sites | Outbound crawl subject to rate limits / blocks |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-18D-01 | Integrity | LLM party extraction | mitigate | Strict JSON schema + numeric range validation; discard anything unparseable or out-of-range; never write hallucinated values |
| T-18D-02 | Integrity | UPSERT of party fields | mitigate | COALESCE/NULLIF guards; verified fields never overwritten by null/empty |
| T-18D-03 | Spoofing/SSRF | enquiry_url from page | mitigate | Accept only absolute http(s) URLs; prefer same-domain; no internal/loopback targets |
| T-18D-04 | DoS | Crawl volume on upstreams | mitigate | Reuse 18B crawlDelay() + jitter + browser headers; 30-day re-crawl interval |
| T-18D-05 | Cost | NVIDIA token spend | mitigate | Regex pre-pass first; LLM only on party-signal pages; cap tokens (NVIDIA_MAX_TOKENS) |
</threat_model>
