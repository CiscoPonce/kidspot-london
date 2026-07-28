# Phase 21: Party Catalogue Maximisation — Context

**Goal:** Grow KidSpot’s database to cover **as many hireable and softplay venues for children’s birthdays in Greater London as practical**, with enough contact and party data that parents can actually use listings.

**Status:** Active (June 2026)  
**Depends on:** Phase 19 curation (`venue_scope`), Phase 18D party extraction, Phase 20 Google Places layer  
**Post-recovery baseline:** DB rebuilt 11 Jun 2026 after Phase 20 volume incident; catalogue structure is sound, **depth is the gap**.

---

## Product definition: what we want in the DB

| Category | Examples | Target `venue_scope` |
|----------|----------|----------------------|
| Softplay & trampoline | Flip Out, Oxygen, Kidspace, Gambado | `core` |
| Council / community hall hire | Community centres, village halls, civic halls | `core` |
| Leisure centres with kids parties | Better Gym, Everyone Active, climbing + parties | `core` |
| Museums / cafes with party programmes | Where `/parties` or booking exists | `core` (when confirmed) |
| Parks | Outdoor play only | `secondary` (not default search) |
| Adult gyms, retail, clinics | Pure Gym, yoga studios | `excluded` |

Default API search returns **`venue_scope = core`** only. Discovery and enrichment must therefore optimise for **core catalogue quality**, not raw row count.

---

## Baseline metrics (11 Jun 2026, production VPS)

| Metric | Value | Notes |
|--------|------:|-------|
| Total venues ingested | ~16,400 | After full rebuild |
| Active **core** | ~2,118 | Party catalogue |
| Core with website | ~404 (~19%) | **Bottleneck for party crawl** |
| Core with phone | ~10 | Nearly empty |
| Core with images | 0 | Brave / Street View / Apify not yielding yet |
| `party_capable` (core) | ~3 | 18D barely started |
| Core with postcode | ~43 | Nominatim 429 backlog |

**Key insight:** Party extraction (18D) requires **websites**. Contact enrichment must run **before** party backfill at scale. Google Places is the highest-leverage existing tool (~1,900 core venues missing phone or website).

---

## Two-loop strategy

```
┌─────────────────────────────────────────────────────────────┐
│  DISCOVERY — find venues we don't have yet                  │
│  OSM sweeps · Google text search · chain brands · council   │
│  CSVs · school/church hall expansion                        │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CURATION — classify scope, deactivate noise                │
│  classify-venue-scope.sql → cleanup-moderate.sql            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ENRICHMENT — deepen each core venue                        │
│  Google Places → direct crawl → party extraction → images   │
└─────────────────────────────────────────────────────────────┘
```

Repeat curation after large discovery or enrichment batches.

---

## Required environment (VPS `.env`)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_PLACES_API_KEY` | Places match + (future) discovery sweep |
| `BRAVE_API_KEY` | Image fallback |
| `NVIDIA_*` | LLM party/contact extraction fallback |
| `FOURSQUARE_API_KEY` | Contact backfill |
| `GEOAPIFY_API_KEY` | POI match + (future) geocoding |
| `APIFY_TOKEN` | Chain discovery + images (needs credits) |
| `DB_PASSWORD`, `REDIS_PASSWORD` | Infrastructure |

Worker container **must** receive `GOOGLE_PLACES_API_KEY` (fixed Jun 2026).

---

## Success criteria (Phase 21 complete)

| Metric | Target |
|--------|--------|
| Active core venues | ≥ 2,500 (after discovery) |
| Core website coverage | ≥ 50% |
| Core phone coverage | ≥ 25% |
| Core `party_capable` | ≥ 200 (or ≥ 10% of core with websites) |
| Core images | ≥ 30% |
| Core postcode | ≥ 80% |
| E15 4GH regression | Atherton Leisure Centre in top 3 radius results |

Query live counts via `backend/scripts/maintenance/borough-coverage-report.sql` or admin enrichment stats endpoint.
