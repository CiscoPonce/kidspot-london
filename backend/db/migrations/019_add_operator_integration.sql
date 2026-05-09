-- Migration 019: Add Operator Integration
-- Purpose: Support operator and chain data (leisure centres, trampoline parks, farm parks)

-- 1. Create operator partnerships table
CREATE TABLE IF NOT EXISTS operator_partnerships (
  id BIGSERIAL PRIMARY KEY,
  operator_name TEXT NOT NULL,
  operator_type TEXT NOT NULL, -- 'leisure_chain', 'trampoline_park', 'farm_park', 'other'
  partnership_type TEXT NOT NULL, -- 'csv', 'static_json', 'affiliate_feed', 'api', 'crawler'
  data_source_url TEXT,
  data_source_type TEXT, -- 'csv', 'json', 'api', 'html'
  licence_name TEXT,
  licence_url TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  confidence_level TEXT DEFAULT 'high', -- 'high', 'medium', 'low'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_name, partnership_type)
);

-- 2. Create indexes for operator partnerships
CREATE INDEX IF NOT EXISTS idx_operator_partnerships_name ON operator_partnerships(operator_name);
CREATE INDEX IF NOT EXISTS idx_operator_partnerships_type ON operator_partnerships(operator_type);
CREATE INDEX IF NOT EXISTS idx_operator_partnerships_partnership ON operator_partnerships(partnership_type);
CREATE INDEX IF NOT EXISTS idx_operator_partnerships_active ON operator_partnerships(is_active) WHERE is_active = TRUE;

-- 3. Create operator crawl log table
CREATE TABLE IF NOT EXISTS operator_crawl_log (
  id BIGSERIAL PRIMARY KEY,
  operator_partnership_id BIGINT NOT NULL REFERENCES operator_partnerships(id),
  crawl_url TEXT NOT NULL,
  tos_version TEXT, -- Terms of Service version at time of crawl
  user_agent TEXT,
  crawl_status TEXT NOT NULL, -- 'success', 'failed', 'blocked', 'rate_limited', 'in_progress'
  venues_found INTEGER DEFAULT 0,
  venues_imported INTEGER DEFAULT 0,
  error_message TEXT,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for operator crawl log
CREATE INDEX IF NOT EXISTS idx_operator_crawl_log_partnership ON operator_crawl_log(operator_partnership_id);
CREATE INDEX IF NOT EXISTS idx_operator_crawl_log_status ON operator_crawl_log(crawl_status);
CREATE INDEX IF NOT EXISTS idx_operator_crawl_log_date ON operator_crawl_log(crawled_at);

-- 5. Create operator venues table for tracking imported operator data
CREATE TABLE IF NOT EXISTS operator_venues (
  id BIGSERIAL PRIMARY KEY,
  operator_partnership_id BIGINT NOT NULL REFERENCES operator_partnerships(id),
  external_id TEXT NOT NULL, -- Operator's venue ID
  name TEXT NOT NULL,
  address TEXT,
  postcode TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  phone TEXT,
  website TEXT,
  listing_url TEXT, -- URL where this venue was found
  last_verified_at TIMESTAMPTZ,
  venue_id BIGINT REFERENCES venues(id), -- Linked venue if matched
  raw_data JSONB, -- Store original operator data
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_partnership_id, external_id)
);

-- 6. Create indexes for operator venues
CREATE INDEX IF NOT EXISTS idx_operator_venues_partnership ON operator_venues(operator_partnership_id);
CREATE INDEX IF NOT EXISTS idx_operator_venues_venue ON operator_venues(venue_id);
CREATE INDEX IF NOT EXISTS idx_operator_venues_postcode ON operator_venues(postcode);
CREATE INDEX IF NOT EXISTS idx_operator_venues_location ON operator_venues USING GIST(
  (ST_MakePoint(lon, lat)::geography)
) WHERE lat IS NOT NULL AND lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operator_venues_last_verified ON operator_venues(last_verified_at);

-- 7. Seed initial operator partnerships (London chains)
INSERT INTO operator_partnerships (operator_name, operator_type, partnership_type, data_source_url, data_source_type, licence_name, licence_url, contact_email, confidence_level) VALUES
  ('Better Leisure', 'leisure_chain', 'api', 'https://www.better.org.uk/library/locations', 'json', 'Open Government Licence', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', 'partnerships@better.org.uk', 'high'),
  ('Everyone Active', 'leisure_chain', 'api', 'https://www.everyoneactive.com/centres', 'html', 'Open Government Licence', 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', 'info@everyoneactive.com', 'high'),
  ('Jump In Trampoline Parks', 'trampoline_park', 'crawler', 'https://www.jumpin.org.uk/locations', 'html', NULL, NULL, 'info@jumpin.org.uk', 'medium')
ON CONFLICT (operator_name, partnership_type) DO NOTHING;

-- 8. Create function to update operator partnership stats
CREATE OR REPLACE FUNCTION update_operator_partnership_stats(partnership_id BIGINT, venues_imported INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE operator_partnerships
  SET updated_at = NOW()
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;
