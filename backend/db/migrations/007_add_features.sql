-- Add features array column to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- Drop function first because return type changes
DROP FUNCTION IF EXISTS search_venues_by_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER);

-- Update search_venues_by_radius function to include features
CREATE OR REPLACE FUNCTION search_venues_by_radius(
    search_lat DOUBLE PRECISION,
    search_lon DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION,
    venue_type_filter TEXT DEFAULT NULL,
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
    features JSONB
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
        v.features
    FROM venues v
    WHERE v.is_active = TRUE
    AND ST_DWithin(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(search_lon, search_lat)::geography, radius_meters)
    AND (venue_type_filter IS NULL OR v.type = venue_type_filter)
    ORDER BY
        -- Sponsored results first (gold > silver > bronze > none)
        CASE
            WHEN v.sponsor_tier = 'gold' THEN 1
            WHEN v.sponsor_tier = 'silver' THEN 2
            WHEN v.sponsor_tier = 'bronze' THEN 3
            ELSE 4
        END,
        -- Within same tier, higher priority first
        v.sponsor_priority DESC NULLS LAST,
        -- Secondary ranking: Kid Score
        v.kid_score DESC NULLS LAST,
        -- Then by distance
        ST_Distance(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(search_lon, search_lat)::geography) ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
