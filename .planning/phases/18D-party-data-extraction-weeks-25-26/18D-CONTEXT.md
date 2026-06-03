# Phase 18D: Party Data Extraction (the party-product data spine)

## Domain

KidSpot's **primary job** is helping a parent find and book a venue for a child's
**birthday party or family reunion**. Today the platform has almost none of the data that
job requires. Phase 18D mines that data — **party capability, price-per-child, capacity,
package names, and an enquiry/booking link** — by extending the Phase 18B enrichment
engine (browser-grade crawl + NVIDIA LLM fallback) to a party-focused extraction pass.

This phase is **sequenced FIRST (or in parallel) ahead of Phase 18C**, because 18C's hero
flow (party cards → shortlist → compare → enquire) renders the fields 18D produces. It is
**backend/enrichment-only**; no frontend changes here.

## Data Reality (why this phase exists)

Across 14,676 active venues (measured 2026-06-03), the party-capable categories have:

| Type | Count | Website | Phone | Booking link | Party price | Party capability captured? |
|------|------:|--------:|------:|-------------:|------------:|----------------------------|
| leisure_centre | 4,172 | 92% | 72% | 0% | 0% | No |
| community_hall | 1,551 | 20% | 7% | 0% | ~1% | No |
| softplay | 321 | 100% | 96% | 0% | 0% | No |
| museum | 20 | 90% | 90% | 0% | 0% | No |
| café | 10 | 10% | 0% | 0% | 50%* | No |

`features` arrays are empty (`[]`) for softplay; only **33 of 14,676** venues mention
"party" anywhere. So for a party product we currently have **no structured party data at
all** — capability, price, capacity, packages, and booking links are absent.

**Addressable now (have a website to crawl):** softplay (~321 @ 100% web), leisure centres
(~3,800 @ 92% web), and the community halls with websites (~310 @ 20% web) — roughly
**4,400 venues** crawlable for party info on day one. Community halls without websites
become a contact-enrichment sub-task (route through the existing 18B contact pipeline).

## Product Thesis (why this is the #1 priority)

A beautiful party-finder over venues with no price, no packages, and no way to book is a
brochure, not a product. The single biggest gap between KidSpot today and its stated
purpose is **the absence of party data**. 18D is the spine; 18C is the surface. Filling
party data also directly feeds Phase 19 monetization (party enquiry leads → owner claims →
sponsorship).

## Prior Decisions / Reused Engine

- **Phase 18B**: `backend/scripts/discovery/sources/direct-crawl-enrichment.ts` already
  crawls venue websites with `browserHeaders()` + `crawlDelay()` and falls back to
  `callNvidia()` (non-streaming, JSON-robust via a `/\{[\s\S]*\}/` extract) when
  cheerio+regex find nothing. 18D adds a **party-extraction prompt + parser** to that same
  flow rather than building new infrastructure.
- **Phase 12 (Party Portal)**: `parent_facets` array + multi-facet schema already exist —
  party capability slots into that model.
- **NVIDIA client**: `backend/src/utils/nvidia.ts`, already wired into the worker env
  (`NVIDIA_*`) and `docker-compose.yml`.
- **Migrations**: `backend/db/migrations/NNN_*.sql`, applied in order (latest = `025`).
  New columns land in `026_add_party_data.sql`.

## Implementation Decisions

### DATA-PARTY-01 — Party-capability schema + detection
- **Approach:** Migration `026_add_party_data.sql` adds nullable columns to `venues`:
  `party_capable BOOLEAN`, `party_price_from NUMERIC(8,2)`, `party_price_unit TEXT`
  (`per_child` | `per_hour` | `flat`), `party_max_capacity INTEGER`,
  `party_packages JSONB`, `party_enquiry_url TEXT`, `party_source TEXT`,
  `party_extracted_at TIMESTAMPTZ`. Index `party_capable WHERE party_capable IS TRUE`.
  Detection runs over party-eligible types (softplay, community_hall, leisure_centre,
  museum, café) that have a website.
- **Refs:** `backend/db/migrations/026_add_party_data.sql`.

### DATA-PARTY-02 — LLM party extractor
- **Approach:** A party-specific prompt for `callNvidia()` that, given crawled page text,
  returns strict JSON: `{ hosts_parties: bool, price_from: number|null, price_unit:
  string|null, max_capacity: number|null, packages: string[], enquiry_url: string|null }`.
  Reuse the existing non-streaming call + JSON-block extraction. Validate before write
  (price £1–£1000, capacity 1–1000, enquiry_url same-domain or absolute http(s)).
  Cheerio/regex pre-pass first (look for "party", "£/child", "book a party", capacity
  patterns) to save LLM calls; LLM is the fallback.
- **Refs:** `backend/src/utils/partyExtraction.ts` (new), `backend/src/utils/nvidia.ts`.

### DATA-PARTY-03 — Wire into the crawl/enrichment flow + worker job
- **Approach:** Extend `direct-crawl-enrichment.ts` to run the party extractor on
  party-eligible venues and UPSERT party columns with COALESCE/NULLIF safety (never
  overwrite a verified value with null/empty). Add a repeatable worker job
  `enrich-party-data` (BullMQ) with `crawlDelay()`, targeting venues where
  `party_extracted_at IS NULL OR < NOW() - interval '30 days'`, party-eligible type, and
  has a website. Re-uses 18B rate limiting.
- **Refs:** `backend/scripts/discovery/sources/direct-crawl-enrichment.ts`,
  `backend/src/worker.ts`.

### DATA-PARTY-04 — Booking link + community-hall contact gap
- **Approach:** Populate `party_enquiry_url` (and `booking_url` when a genuine booking
  page is found). For community halls without a website (the worst contact gap, 7% phone),
  route them through the existing 18B OSM/contact enrichment so the frontend has at least a
  phone/enquiry path. Track coverage so 18C knows what it can render.
- **Refs:** `backend/scripts/discovery/sources/direct-crawl-enrichment.ts`, 18B contact pipeline.

## Success Criteria

- **Coverage:** `party_capable` determined (true/false) for **≥80% of softplay** and
  **≥60% of leisure_centre/community_hall that have websites**.
- **Decision data:** `party_price_from` populated for **≥40% of party-capable softplay**;
  `party_enquiry_url` or `booking_url` for **≥50% of party-capable venues**.
- **Quality:** spot-check sample shows extracted price/capacity/booking match the source
  page (no hallucinated values; validation rejects out-of-range numbers).
- **No regressions:** COALESCE/NULLIF guarantees a verified field is never overwritten by
  null/empty; `tsc --noEmit` and existing enrichment tests pass.
- **Throughput:** the `enrich-party-data` job clears the ~4,400 website-bearing eligible
  venues within the crawl-delay budget (track ETA, as in 18B).

## Canonical References

- `.planning/ROADMAP.md`, `.planning/STATE.md`
- `.planning/phases/18C-frontend-polish-mobile-first-experience-weeks-25-26/` (the consumer)
- `.planning/phases/18B-contact-extraction-yield-optimization-weeks-23-24/` (the engine)
- `backend/scripts/discovery/sources/direct-crawl-enrichment.ts`
- `backend/src/utils/{nvidia,httpHeaders,rateLimiter}.ts`, `backend/src/worker.ts`
- `backend/db/migrations/`

## Deferred Ideas (→ Phase 19)

- Owner-confirmed party packages (verified pricing/availability via the claim flow).
- Structured availability/booking calendar integration (OpenActive operators).
- Aggregated party-enquiry lead routing to owners.
