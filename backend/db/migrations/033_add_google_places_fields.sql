-- Phase 19: Google Places Enrichment Layer
-- Added for venues missing basic contact info (phone/website)

ALTER TABLE venues ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS google_places_enriched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_venues_google_places_enriched_at ON venues(google_places_enriched_at);
