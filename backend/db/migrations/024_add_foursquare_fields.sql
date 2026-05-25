-- Foursquare enrichment tracking
ALTER TABLE venues ADD COLUMN IF NOT EXISTS foursquare_place_id TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS foursquare_enriched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_venues_foursquare_enriched_at ON venues(foursquare_enriched_at);
CREATE INDEX IF NOT EXISTS idx_venues_foursquare_place_id ON venues(foursquare_place_id) WHERE foursquare_place_id IS NOT NULL;
