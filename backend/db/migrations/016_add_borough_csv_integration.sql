-- Migration: Add borough CSV integration
-- Description: Create tables and functions for London Borough CSV dataset ingestion

-- 1. Create borough CSV sources table
CREATE TABLE IF NOT EXISTS borough_csv_sources (
  id BIGSERIAL PRIMARY KEY,
  borough_name TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  dataset_url TEXT NOT NULL,
  dataset_type TEXT NOT NULL, -- 'leisure_centres', 'adventure_playgrounds', 'play_areas', 'community_halls'
  licence_name TEXT,
  licence_url TEXT,
  last_fetched_at TIMESTAMPTZ,
  last_imported_at TIMESTAMPTZ,
  record_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(borough_name, dataset_name)
);

-- 2. Create indexes for borough CSV queries
CREATE INDEX IF NOT EXISTS idx_borough_csv_borough ON borough_csv_sources(borough_name);
CREATE INDEX IF NOT EXISTS idx_borough_csv_type ON borough_csv_sources(dataset_type);
CREATE INDEX IF NOT EXISTS idx_borough_csv_active ON borough_csv_sources(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_borough_csv_last_imported ON borough_csv_sources(last_imported_at);

-- 3. Create borough CSV records table for tracking imported records
CREATE TABLE IF NOT EXISTS borough_csv_records (
  id BIGSERIAL PRIMARY KEY,
  borough_csv_source_id BIGINT NOT NULL REFERENCES borough_csv_sources(id),
  external_id TEXT, -- ID from CSV (if available)
  name TEXT NOT NULL,
  address TEXT,
  postcode TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  venue_id BIGINT REFERENCES venues(id), -- Linked venue if matched
  raw_data JSONB, -- Store original CSV row for debugging
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(borough_csv_source_id, external_id)
);

-- 4. Create indexes for borough CSV records
CREATE INDEX IF NOT EXISTS idx_borough_csv_records_source ON borough_csv_records(borough_csv_source_id);
CREATE INDEX IF NOT EXISTS idx_borough_csv_records_venue ON borough_csv_records(venue_id);
CREATE INDEX IF NOT EXISTS idx_borough_csv_records_postcode ON borough_csv_records(postcode);
CREATE INDEX IF NOT EXISTS idx_borough_csv_records_location ON borough_csv_records USING GIST(
  (ST_MakePoint(lon, lat)::geography)
) WHERE lat IS NOT NULL AND lon IS NOT NULL;

-- 5. Seed initial borough CSV sources (London boroughs with known datasets)
INSERT INTO borough_csv_sources (borough_name, dataset_name, dataset_url, dataset_type, licence_name, licence_url) VALUES
  ('Lambeth', 'Leisure Centres', 'https://data.london.gov.uk/download/leisure-centres/ce44a658-fbdc-4d28-a9e8-132f07f4bea4/leisure-centres25.csv', 'leisure_centres', 'Open Government Licence', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'),
  ('Lambeth', 'Adventure Playgrounds', 'https://data.london.gov.uk/download/adventure-playgrounds/ce44a658-fbdc-4d28-a9e8-132f07f4bea4/adventure-playgrounds.csv', 'adventure_playgrounds', 'Open Government Licence', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'),
  ('Hackney', 'Community Halls', 'https://data.london.gov.uk/download/community-halls/ce44a658-fbdc-4d28-a9e8-132f07f4bea4/community-halls.csv', 'community_halls', 'Open Government Licence', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/')
ON CONFLICT (borough_name, dataset_name) DO NOTHING;

-- 6. Create function to update borough CSV source stats
CREATE OR REPLACE FUNCTION update_borough_csv_stats(source_id BIGINT, record_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE borough_csv_sources
  SET record_count = $2,
      last_imported_at = NOW(),
      updated_at = NOW()
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;
