-- Migration: Add slugs and boroughs to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS borough TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index for slug
-- This will fail if there are non-unique slugs, but since the columns are new, it should be fine.
-- Note: NULL values are allowed and don't conflict with each other in a standard unique index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);

-- Index for borough filtering
CREATE INDEX IF NOT EXISTS idx_venues_borough ON venues(borough);

-- Function to safely insert venue with deduplication check (updated with slug/borough)
CREATE OR REPLACE FUNCTION insert_venue_if_not_duplicate(
    p_source TEXT,
    p_source_id TEXT,
    p_name TEXT,
    p_type TEXT,
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_slug TEXT DEFAULT NULL,
    p_borough TEXT DEFAULT NULL,
    p_sponsor_tier TEXT DEFAULT NULL,
    p_sponsor_priority INTEGER DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    venue_id BIGINT;
BEGIN
    -- Check for duplicate
    IF is_duplicate_venue(p_name, p_lat, p_lon) THEN
        -- Return existing venue ID or NULL
        SELECT id INTO venue_id FROM venues
        WHERE ST_DWithin(ST_MakePoint(lon, lat)::geography, ST_MakePoint(p_lon, p_lat)::geography, 50)
        AND levenshtein(lower(name), lower(p_name)) < 4
        AND is_active = TRUE
        LIMIT 1;
        RETURN venue_id;
    END IF;

    -- Insert new venue
    INSERT INTO venues (
        source, source_id, name, type, lat, lon, slug, borough,
        sponsor_tier, sponsor_priority, last_scraped
    ) VALUES (
        p_source, p_source_id, p_name, p_type, p_lat, p_lon, p_slug, p_borough,
        p_sponsor_tier, p_sponsor_priority, NOW()
    )
    ON CONFLICT (source_id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        slug = EXCLUDED.slug,
        borough = EXCLUDED.borough,
        sponsor_tier = EXCLUDED.sponsor_tier,
        sponsor_priority = EXCLUDED.sponsor_priority,
        last_scraped = NOW()
    RETURNING id INTO venue_id;

    RETURN venue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to search venues by location and radius (updated with slug)
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
    slug TEXT
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
        v.slug
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
        -- Then by distance
        ST_Distance(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(search_lon, search_lat)::geography) ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
