ALTER TABLE venues ADD COLUMN IF NOT EXISTS website_crawl_enriched_at TIMESTAMPTZ;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS osm_hours_enriched_at TIMESTAMPTZ;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS geoapify_place_id TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS geoapify_enriched_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_venues_website_crawl_enriched_at ON venues(website_crawl_enriched_at);
CREATE INDEX IF NOT EXISTS idx_venues_osm_hours_enriched_at ON venues(osm_hours_enriched_at);
CREATE INDEX IF NOT EXISTS idx_venues_geoapify_enriched_at ON venues(geoapify_enriched_at);
