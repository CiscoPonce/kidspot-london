# Phase 15: Data Quality & Contact Enrichment

## Problem Statement

KidSpot's database contains **11,076 active venues** but suffers from critical data quality issues:

1. **52.7% of venues (5,833) have no real name** — stored as `"OSM 12345678"`, completely unusable.
2. **Only 0.14% (16 venues) have a website** populated. Only 13 have a phone number.
3. **Phase 14's enrichment scripts were never built** — the DB columns exist but no data pipeline fills them.
4. **The venue detail API omits contact columns** — even venues WITH data show nothing to users.
5. **Reverse-geocoding covers only 7.2%** of venues after months of running.

**Impact**: Parents see venue names like "OSM 5397730721", no phone number, no website, no way to book. The platform is unusable for its core purpose.

---

## Strategy

### Step 1: Clean the Data (Day 1)
- Soft-delete unnamed OSM venues, out-of-London venues, and zero-coordinate venues.
- Run deduplication sweep.
- **Outcome**: ~5,200 high-quality, named active venues.

### Step 2: Fix the API (Day 1)
- Update `venueService.ts` detail queries to include `website`, `phone`, `email`, `booking_url`, `address`, `postcode`, `borough`.
- **Outcome**: Existing enriched data becomes visible immediately.

### Step 3: OSM Contact Enrichment (Day 2-3)
- Batch-query Overpass API for 4,000 named OSM venues.
- Extract `website`, `phone`, `email`, `opening_hours` from OSM tags.
- **Outcome**: Expect 20-40% of OSM venues to gain at least one contact field.

### Step 4: Accelerate Reverse-Geocoding (Day 2)
- Increase batch size from 30 → 100 venues per run.
- **Outcome**: Full address coverage in ~9 days instead of 29.

### Step 5: Web Scraper for High-Value Venues (Day 3-4)
- Target: 81 softplays, 77 leisure centres, 22 museums.
- Use Brave Search + HTML scraping.
- **Outcome**: Booking URLs, emails, and phone numbers for premium venues.

### Step 6: Frontend CTAs (Day 4-5)
- Add "Book Now", "Email", "Call" buttons.
- Contact availability indicators on venue cards.
- **Outcome**: Parents can take action directly from the platform.

---

## Technical Changes

### Database
- **Migration `021_phase15_data_quality.sql`**: Cleanup + new columns (`description`, `opening_hours`).

### Backend
- **New**: `osm-contact-enrichment.ts` (Overpass tag extraction)
- **New**: `web-scraper-enrichment.ts` (Brave Search + HTML scraping)
- **New**: `dedup-sweep.ts` (duplicate venue merger)
- **New**: `admin/enrichment-stats.ts` (dashboard endpoint)
- **Modify**: `venueService.ts` (fix detail queries)
- **Modify**: `enrichment.ts` (batch size increase)
- **Modify**: `data-enrichment.ts` (orchestrate new layers)

### Frontend
- **Modify**: `venue-detail-content.tsx` (Book Now, Email CTAs)
- **Modify**: `venue-card.tsx` (contact availability icons)

---

## Success Metrics

| Metric | Before | Target |
|---|---|---|
| Active venues (quality) | 11,076 (52.7% unnamed) | ~5,200 (0% unnamed) |
| Has website | 0.14% | >30% |
| Has phone | 0.12% | >25% |
| Has address | 3.2% | >80% |
| Has postcode | 3.3% | >80% |
| Has borough | 8.4% | >90% |
| Venue detail shows contact | 0% | 100% (when data exists) |
