# Phase 14: Contact & Booking Data Enrichment (Zero-Cost Strategy)

## Problem Statement

The KidSpot database has **11,076 active venues** and currently **0% have a website or phone number populated**. The existing enrichment pipeline only handles reverse-geocoding (address/postcode/borough) and does not fetch contact details.

**Impact**: Parents cannot call, visit a website, or book directly from the platform, making the venue detail pages unusable for actionable conversions.

---

## Zero-Cost Enrichment Strategy

To keep infrastructure costs at £0, we will completely bypass the Google Places API. We will use a two-layered, free OSINT approach.

### Layer 1: OSM Tag Extraction
- **Target**: 9,839 venues sourced from OpenStreetMap.
- **Method**: Query the Overpass API using existing `source_id`s to pull the full tag set.
- **Data Extracted**: `website`, `phone`, `contact:email`, `contact:website`, `opening_hours`.

### Layer 2: Search Engine & Web Scraping
- **Target**: High-value commercial venues (softplays, leisure centres, museums) that are missing websites after Layer 1.
- **Method**:
  1. Use **Brave Search API** (free tier already configured) to find the official website URL.
  2. Use **Cheerio** (HTML scraper) to fetch the homepage and `/contact` pages.
  3. Extract `mailto:` links, phone numbers (via regex), and common booking platform links (e.g., Eventbrite, Bookwhen).

---

## Proposed Technical Changes

### 1. Database Updates
**Migration `021_phase14_contact_enrichment.sql`**
- Add `email TEXT` and `booking_url TEXT` columns.
- Add `contact_enriched_at TIMESTAMPTZ` column.

### 2. Backend Enrichment Engine
**New Scripts:**
- `backend/scripts/discovery/sources/osm-contact-enrichment.ts`
- `backend/scripts/discovery/sources/web-scraper-enrichment.ts`

**Updates:**
- Modify `backend/scripts/discovery/data-enrichment.ts` to trigger these new layers.
- Update `backend/src/services/venueService.ts` to actually select `website, phone, email, booking_url` in the details query (currently omitted).

### 3. Frontend UX Improvements
**Updates to `venue-detail-content.tsx`:**
- Add a prominent **"Book Now"** CTA button (linking to `booking_url` or `website`).
- Add an **"Email"** button.
- Add visual indicators for available contact methods on the venue cards.

---

## Execution Plan
1. **Fix Backend Queries**: Update `venueService.ts` so any existing data becomes visible.
2. **Build OSM Extractor**: Implement and run Layer 1.
3. **Build Web Scraper**: Implement Layer 2 for high-priority venues (softplays).
4. **Deploy Frontend**: Roll out the new CTAs.
