-- Migration 003: Change source_id UNIQUE constraint to UNIQUE (source, source_id)
-- This allows different sources to potentially have overlapping IDs, 
-- while ensuring uniqueness within a single source.

-- 1. Drop the existing unique constraint on source_id
-- The default name for UNIQUE(source_id) on table 'venues' is 'venues_source_id_key'
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_source_id_key;

-- 2. Add the composite unique constraint
ALTER TABLE venues ADD CONSTRAINT venues_source_source_id_key UNIQUE (source, source_id);

-- 3. Update the insert_venue_if_not_duplicate function to handle the new constraint
CREATE OR REPLACE FUNCTION insert_venue_if_not_duplicate(
    p_source TEXT,
    p_source_id TEXT,
    p_name TEXT,
    p_type TEXT,
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
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
        source, source_id, name, type, lat, lon,
        sponsor_tier, sponsor_priority, last_scraped
    ) VALUES (
        p_source, p_source_id, p_name, p_type, p_lat, p_lon,
        p_sponsor_tier, p_sponsor_priority, NOW()
    )
    ON CONFLICT (source, source_id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        sponsor_tier = EXCLUDED.sponsor_tier,
        sponsor_priority = EXCLUDED.sponsor_priority,
        last_scraped = NOW()
    RETURNING id INTO venue_id;

    RETURN venue_id;
END;
$$ LANGUAGE plpgsql;
