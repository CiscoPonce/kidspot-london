-- Migration 018: Add OpenActive integration
-- Description: Adds tables and functions for OpenActive feed discovery, location ingestion, and session tracking.

-- 1. Create OpenActive feeds table
CREATE TABLE IF NOT EXISTS openactive_feeds (
  id BIGSERIAL PRIMARY KEY,
  publisher_name TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  feed_type TEXT NOT NULL, -- 'opportunity', 'scheduled_session', 'facility_use'
  licence_name TEXT,
  licence_url TEXT,
  refresh_cadence TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  last_fetched_at TIMESTAMPTZ,
  last_imported_at TIMESTAMPTZ,
  session_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feed_url)
);

-- 2. Create indexes for OpenActive feeds
CREATE INDEX IF NOT EXISTS idx_openactive_feeds_publisher ON openactive_feeds(publisher_name);
CREATE INDEX IF NOT EXISTS idx_openactive_feeds_type ON openactive_feeds(feed_type);
CREATE INDEX IF NOT EXISTS idx_openactive_feeds_active ON openactive_feeds(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_openactive_feeds_last_imported ON openactive_feeds(last_imported_at);

-- 3. Create OpenActive locations table
CREATE TABLE IF NOT EXISTS openactive_locations (
  id BIGSERIAL PRIMARY KEY,
  openactive_feed_id BIGINT NOT NULL REFERENCES openactive_feeds(id),
  external_id TEXT NOT NULL, -- OpenActive location ID
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  postcode TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  url TEXT,
  venue_id BIGINT REFERENCES venues(id), -- Linked venue if matched
  raw_data JSONB, -- Store original OpenActive location data
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(openactive_feed_id, external_id)
);

-- 4. Create indexes for OpenActive locations
CREATE INDEX IF NOT EXISTS idx_openactive_locations_feed ON openactive_locations(openactive_feed_id);
CREATE INDEX IF NOT EXISTS idx_openactive_locations_venue ON openactive_locations(venue_id);
CREATE INDEX IF NOT EXISTS idx_openactive_locations_postcode ON openactive_locations(postcode);
CREATE INDEX IF NOT EXISTS idx_openactive_locations_location ON openactive_locations USING GIST(
  (ST_MakePoint(lon, lat)::geography)
) WHERE lat IS NOT NULL AND lon IS NOT NULL;

-- 5. Create OpenActive sessions table
CREATE TABLE IF NOT EXISTS openactive_sessions (
  id BIGSERIAL PRIMARY KEY,
  openactive_location_id BIGINT NOT NULL REFERENCES openactive_locations(id),
  external_id TEXT NOT NULL, -- OpenActive session ID
  name TEXT NOT NULL,
  description TEXT,
  activity_type TEXT, -- e.g., 'Kids Swimming', 'Toddler Gym'
  age_range TEXT, -- e.g., '0-5', '5-11'
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  schedule TEXT, -- e.g., 'Mondays 10:00-11:00'
  price TEXT,
  booking_url TEXT,
  availability_status TEXT, -- e.g., 'available', 'full', 'waitlist'
  raw_data JSONB, -- Store original OpenActive session data
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(openactive_location_id, external_id)
);

-- 6. Create indexes for OpenActive sessions
CREATE INDEX IF NOT EXISTS idx_openactive_sessions_location ON openactive_sessions(openactive_location_id);
CREATE INDEX IF NOT EXISTS idx_openactive_sessions_start_date ON openactive_sessions(start_date);
CREATE INDEX IF NOT EXISTS idx_openactive_sessions_activity_type ON openactive_sessions(activity_type);
CREATE INDEX IF NOT EXISTS idx_openactive_sessions_age_range ON openactive_sessions(age_range);

-- 7. Seed initial OpenActive feeds (London pilot targets)
INSERT INTO openactive_feeds (publisher_name, feed_url, feed_type, licence_name, licence_url, refresh_cadence) VALUES
  ('Better Leisure', 'https://api.better.org.uk/openactive/scheduled-sessions', 'scheduled_session', 'Open Government Licence', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', 'daily'),
  ('Everyone Active', 'https://www.everyoneactive.com/openactive/scheduled-sessions', 'scheduled_session', 'Open Government Licence', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', 'daily')
ON CONFLICT (feed_url) DO NOTHING;

-- 8. Create function to update OpenActive feed stats
CREATE OR REPLACE FUNCTION update_openactive_feed_stats(feed_id BIGINT, session_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE openactive_feeds
  SET session_count = $2,
      last_imported_at = NOW(),
      updated_at = NOW()
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;
