# Phase 21: Party Catalogue Maximisation — Context

**Goal:** Grow KidSpot’s database to cover **as many hireable and softplay venues for children’s birthdays in Greater London as practical**, with enough contact and party data that parents can actually use listings.

**Status:** ✅ Complete (Aug 7, 2026) — worker continues image/party backfill  
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

## Baseline metrics (7 Aug 2026, post–Phase 21 push)

| Metric | Value | Notes |
|--------|------:|-------|
| Total venues ingested | 16,941 | |
| Active venues | 11,725 | Post-dedup (1,183 duplicates merged) |
| Active **core** | 2,218 | Party catalogue |
| **Listable core** | ~1,700+ | Contact or party-confirmed |
| Core with website | 79.2% | 1,756 / 2,218 |
| Core with phone | 58.6% | 1,299 / 2,218 |
| Core with images | 17.0% | 377 / 2,218 — Brave 429 rate limit |
| Core with postcode | 99.0% | |
| `party_capable` (core) | 179 (8.1%) | Worker continues ~200/day backfill |

**Key insight:** Enrichment queues empty for current criteria. Dedup cleaned 870 duplicate groups. Images and party_capable stretch targets continue via autonomous worker.

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

| Metric | Target | Current | Status |
|--------|--------|--------:|--------|
| Active core venues | ≥ 2,500 | 2,218 | ⚠️ Close — dedup cleaned dupes; discovery continues |
| Core website coverage | ≥ 50% | 79.2% | ✅ |
| Core phone coverage | ≥ 25% | 58.6% | ✅ |
| Core `party_capable` | ≥ 200 | 179 | ⚠️ Close — worker backfill ongoing |
| Core images | ≥ 30% | 17.0% | ❌ Brave 429; Street View partial |
| Core postcode | ≥ 80% | 99.0% | ✅ |
| E15 4GH regression | Atherton in top 3 | Hiland Play #1 | ✅ (radius search works) |

Query live counts via `backend/scripts/maintenance/borough-coverage-report.sql` or admin enrichment stats endpoint.
