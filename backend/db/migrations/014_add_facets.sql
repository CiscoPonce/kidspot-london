-- Add parent_facets array column to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS parent_facets TEXT[] DEFAULT '{}'::text[];

-- Add GIN index for efficient array queries
CREATE INDEX IF NOT EXISTS idx_venues_parent_facets ON venues USING GIN(parent_facets);

-- Create enum type for valid facets
-- Note: Using a domain or just check constraint since we want to store them in a text array
-- for easier application-side handling while maintaining Postgres performance.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_facet') THEN
        CREATE TYPE venue_facet AS ENUM (
          'soft_play',
          'trampoline',
          'party_room',
          'activity_session',
          'farm_venue',
          'museum_programme',
          'hall_hire',
          'outdoor_play',
          'cafe',
          'wheelchair_accessible',
          'parking'
        );
    END IF;
END$$;

-- Add constraint to ensure only valid facets
-- We check against the enum values or a list of strings
ALTER TABLE venues DROP CONSTRAINT IF EXISTS check_parent_facets_valid;
ALTER TABLE venues ADD CONSTRAINT check_parent_facets_valid
  CHECK (parent_facets IS NULL OR array_length(parent_facets, 1) IS NULL OR
         (parent_facets <@ ARRAY['soft_play'::text, 'trampoline'::text, 'party_room'::text,
                                'activity_session'::text, 'farm_venue'::text,
                                'museum_programme'::text, 'hall_hire'::text,
                                'outdoor_play'::text, 'cafe'::text,
                                'wheelchair_accessible'::text, 'parking'::text]));

-- Update search_venues_by_radius function to support facet search
-- Or create a new one as requested: search_venues_by_facets
CREATE OR REPLACE FUNCTION search_venues_by_facets(
  search_lat DOUBLE PRECISION,
  search_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION,
  facet_filter TEXT[] DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id BIGINT,
  source TEXT,
  source_id TEXT,
  name TEXT,
  type TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,
  sponsor_tier TEXT,
  sponsor_priority INTEGER,
  kid_score NUMERIC,
  rating NUMERIC,
  price_level INTEGER,
  features JSONB,
  parent_facets TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.source,
    v.source_id,
    v.name,
    v.type,
    v.lat,
    v.lon,
    ST_Distance(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(search_lon, search_lat)::geography) / 1609.34 AS distance_miles,
    v.sponsor_tier,
    v.sponsor_priority,
    v.kid_score,
    v.rating,
    v.price_level,
    v.features,
    v.parent_facets
  FROM venues v
  WHERE v.is_active = TRUE
  AND ST_DWithin(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(search_lon, search_lat)::geography, radius_meters)
  AND (facet_filter IS NULL OR v.parent_facets && facet_filter)
  ORDER BY
    CASE
      WHEN v.sponsor_tier = 'gold' THEN 1
      WHEN v.sponsor_tier = 'silver' THEN 2
      WHEN v.sponsor_tier = 'bronze' THEN 3
      ELSE 4
    END,
    v.sponsor_priority DESC NULLS LAST,
    v.kid_score DESC NULLS LAST,
    ST_Distance(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(search_lon, search_lat)::geography) ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to migrate existing type to parent_facets
CREATE OR REPLACE FUNCTION migrate_type_to_facets()
RETURNS VOID AS $$
BEGIN
  -- Map existing types to facets
  UPDATE venues SET parent_facets = ARRAY['soft_play'] WHERE type = 'softplay' AND (parent_facets IS NULL OR parent_facets = '{}');
  UPDATE venues SET parent_facets = ARRAY['hall_hire'] WHERE type = 'community_hall' AND (parent_facets IS NULL OR parent_facets = '{}');
  UPDATE venues SET parent_facets = ARRAY['activity_session'] WHERE type = 'leisure_centre' AND (parent_facets IS NULL OR parent_facets = '{}');
  UPDATE venues SET parent_facets = ARRAY['outdoor_play'] WHERE type = 'park' AND (parent_facets IS NULL OR parent_facets = '{}');
  UPDATE venues SET parent_facets = ARRAY['museum_programme'] WHERE type = 'museum' AND (parent_facets IS NULL OR parent_facets = '{}');
  UPDATE venues SET parent_facets = ARRAY['cafe'] WHERE type = 'cafe' AND (parent_facets IS NULL OR parent_facets = '{}');
END;
$$ LANGUAGE plpgsql;
