# Summary 17-04: Rich Data Schema Upgrades

## Objective
Update the database schema and application layers to store and display the rich metadata (opening hours and hero images) provided by the Apify integration.

## Accomplishments
- **Database Migration**: Created and executed `backend/db/migrations/022_add_rich_venue_data.sql`, adding `opening_hours` (JSONB) and `images` (TEXT[]) columns to the `venues` table.
- **API & Backend Types**:
    - Updated `backend/src/types/venue.ts` to include `opening_hours` and `images`.
    - Modified `backend/src/services/venueService.ts` to select these new columns in `getVenueDetailsBySlug` and `getVenueDetailsById`.
- **Frontend Integration**:
    - Updated `frontend/src/lib/api.ts` to include `images` and allow flexible `opening_hours` types.
    - Enhanced `frontend/src/components/venues/venue-detail-content.tsx` to display hero images and support both Yelp and Apify opening hours formats.
- **Enrichment Logic**: Updated `backend/scripts/discovery/sources/apify-enrichment.ts` to fetch these fields.

## Verification
- Migration executed successfully.
- API and UI verified to handle the new fields gracefully.
