-- Migration 001: Create minimal venues table for lean database approach
-- This migration creates the initial database schema for KidSpot London
-- Focus: Store only essential venue data (name, location, type, source)
-- Full venue details are fetched on-demand via agentic search

-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable fuzzystrmatch extension for Levenshtein distance (deduplication)
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Create venues table (minimal schema - lean database approach)
CREATE TABLE IF NOT EXISTS venues (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    type TEXT NOT NULL,           -- 'softplay', 'community_hall', 'park', 'other'
    source TEXT NOT NULL,         -- 'google', 'yelp', 'tripadvisor', 'osm', 'manual'
    source_id TEXT UNIQUE,        -- External ID for deduplication (e.g., 'google_place_id_123')
    last_scraped TIMESTAMPTZ,     -- When we last checked this venue
    sponsor_tier TEXT,            -- NULL, 'bronze', 'silver', 'gold' (future monetization)
    sponsor_priority INTEGER,      -- For ranking sponsored results (higher = more prominent)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for blazing fast radius queries
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST(
    ST_MakePoint(lon, lat)::geography
);

-- Create index for quick filtering by type
CREATE INDEX IF NOT EXISTS idx_venues_type ON venues(type);

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_venues_source ON venues(source);

-- Create index for sponsor results (for monetization)
CREATE INDEX IF NOT EXISTS idx_venues_sponsor ON venues(sponsor_tier, sponsor_priority) WHERE sponsor_tier IS NOT NULL;

-- Create index for active venues only
CREATE INDEX IF NOT EXISTS idx_venues_active ON venues(is_active) WHERE is_active = TRUE;

-- Create index for last_scraped (for cron agent to find stale venues)
CREATE INDEX IF NOT EXISTS idx_venues_last_scraped ON venues(last_scraped);

-- Deduplication function: Returns true if a similar venue exists within 50 meters
CREATE OR REPLACE FUNCTION is_duplicate_venue(new_name TEXT, new_lat DOUBLE PRECISION, new_lon DOUBLE PRECISION)
RETURNS BOOLEAN AS $$
DECLARE
    is_dup BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM venues
        WHERE ST_DWithin(ST_MakePoint(lon, lat)::geography, ST_MakePoint(new_lon, new_lat)::geography, 50)
        AND levenshtein(lower(name), lower(new_name)) < 4
        AND is_active = TRUE
    ) INTO is_dup;
    RETURN is_dup;
END;
$$ LANGUAGE plpgsql;

-- Function to safely insert venue with deduplication check
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
        source, source_id, name, type, lat, lon,
        sponsor_tier, sponsor_priority, last_scraped
    ) VALUES (
        p_source, p_source_id, p_name, p_type, p_lat, p_lon,
        p_sponsor_tier, p_sponsor_priority, NOW()
    )
    ON CONFLICT (source_id) DO UPDATE SET
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

-- Function to search venues by location and radius (with sponsor ranking)
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
    sponsor_priority INTEGER
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
        v.sponsor_priority
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

-- Function to update venue scrape timestamp
CREATE OR REPLACE FUNCTION update_venue_scrape_time(venue_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE venues
    SET last_scraped = NOW()
    WHERE id = venue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark venue as inactive
CREATE OR REPLACE FUNCTION deactivate_venue(venue_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE venues
    SET is_active = FALSE
    WHERE id = venue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get venues that need scraping (stale data)
CREATE OR REPLACE FUNCTION get_venues_needing_scrape(
    stale_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    id BIGINT,
    name TEXT,
    source TEXT,
    source_id TEXT,
    last_scraped TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.name,
        v.source,
        v.source_id,
        v.last_scraped
    FROM venues v
    WHERE v.is_active = TRUE
    AND (
        v.last_scraped IS NULL
        OR v.last_scraped < NOW() - (stale_hours || ' hours')::INTERVAL
    )
    ORDER BY
        -- Prioritize sponsored venues
        CASE
            WHEN v.sponsor_tier = 'gold' THEN 1
            WHEN v.sponsor_tier = 'silver' THEN 2
            WHEN v.sponsor_tier = 'bronze' THEN 3
            ELSE 4
        END,
        -- Then by oldest last_scraped
        v.last_scraped ASC NULLS FIRST
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Function to update sponsor tier
CREATE OR REPLACE FUNCTION update_sponsor_tier(
    venue_id BIGINT,
    new_tier TEXT,
    new_priority INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE venues
    SET
        sponsor_tier = new_tier,
        sponsor_priority = new_priority
    WHERE id = venue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get sponsor statistics
CREATE OR REPLACE FUNCTION get_sponsor_stats()
RETURNS TABLE (
    tier TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM venues WHERE is_active = TRUE;

    RETURN QUERY
    SELECT
        COALESCE(sponsor_tier, 'none') as tier,
        COUNT(*) as count,
        ROUND(COUNT(*)::NUMERIC / NULLIF(total_count, 0) * 100, 2) as percentage
    FROM venues
    WHERE is_active = TRUE
    GROUP BY sponsor_tier
    ORDER BY
        CASE
            WHEN sponsor_tier = 'gold' THEN 1
            WHEN sponsor_tier = 'silver' THEN 2
            WHEN sponsor_tier = 'bronze' THEN 3
            ELSE 4
        END;
END;
$$ LANGUAGE plpgsql;
