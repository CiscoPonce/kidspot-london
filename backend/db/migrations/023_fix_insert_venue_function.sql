-- Migration 023: Fix insert_venue_if_not_duplicate function signature and constraint references
-- This migration updates the 10-parameter signature of insert_venue_if_not_duplicate
-- to correctly handle the (source, source_id) composite unique constraint instead of the old source_id unique constraint.

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
    -- Check for duplicate by name and location (fuzzy matching)
    -- This handles cross-source duplicates (e.g., same park in Google and OSM)
    IF is_duplicate_venue(p_name, p_lat, p_lon) THEN
        -- Return existing venue ID
        SELECT id INTO venue_id FROM venues
        WHERE ST_DWithin(ST_MakePoint(lon, lat)::geography, ST_MakePoint(p_lon, p_lat)::geography, 50)
        AND levenshtein(lower(name), lower(p_name)) < 4
        AND is_active = TRUE
        LIMIT 1;
        
        IF venue_id IS NOT NULL THEN
            RETURN venue_id;
        END IF;
    END IF;

    -- Insert new venue or update existing one IF it matches the same source and source_id
    INSERT INTO venues (
        source, source_id, name, type, lat, lon, slug, borough,
        sponsor_tier, sponsor_priority, last_scraped
    ) VALUES (
        p_source, p_source_id, p_name, p_type, p_lat, p_lon, p_slug, p_borough,
        p_sponsor_tier, p_sponsor_priority, NOW()
    )
    ON CONFLICT (source, source_id) DO UPDATE SET
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
