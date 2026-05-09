-- Migration 020: Phase 12-07 — auto-lock manual seeds, expose parent_facets in spatial search,
-- create venue_source_claims convergence table, and repair Atherton soft-play classification.
-- All operations are idempotent.

-- 1. Create venue_source_claims if missing (operatorService.updateVenueFromOperator depends on it)
CREATE TABLE IF NOT EXISTS venue_source_claims (
    id BIGSERIAL PRIMARY KEY,
    venue_id BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    external_id TEXT NOT NULL,
    claim_type TEXT NOT NULL,
    claim_data JSONB,
    confidence TEXT DEFAULT 'medium',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (venue_id, source_name, external_id)
);

CREATE INDEX IF NOT EXISTS idx_vsc_venue ON venue_source_claims(venue_id);
CREATE INDEX IF NOT EXISTS idx_vsc_source ON venue_source_claims(source_name);
CREATE INDEX IF NOT EXISTS idx_vsc_type ON venue_source_claims(claim_type);

-- 2. Auto-lock manual seeds so nightly enrichment cannot silently rewrite them.
--    Logged to provenance via the existing trigger on venues, so any future
--    accidental unlock is auditable.
UPDATE venues
SET editor_locked = TRUE
WHERE source = 'manual'
  AND editor_locked = FALSE;

-- 3. Repair Atherton Leisure Centre — restore type and add the soft_play / party_room facets
--    that nightly enrichment had stripped. Idempotent: only operates on the known seed.
UPDATE venues
SET type = 'softplay',
    parent_facets = ARRAY['soft_play', 'party_room', 'activity_session']::text[],
    primary_label = 'Soft Play',
    editor_locked = TRUE
WHERE slug = 'atherton-leisure-centre';

-- 4. Recreate the spatial search function to expose parent_facets.
--    Drop is required because the return-row shape changes.
DROP FUNCTION IF EXISTS search_venues_by_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER);

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
    features JSONB,
    parent_facets TEXT[],
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
        ST_Distance(ST_MakePoint(v.lon, v.lat)::geography,
                    ST_MakePoint(search_lon, search_lat)::geography) / 1609.34 AS distance_miles,
        v.sponsor_tier,
        v.sponsor_priority,
        v.kid_score,
        v.rating,
        v.price_level,
        v.features,
        v.parent_facets,
        v.slug
    FROM venues v
    WHERE v.is_active = TRUE
      AND ST_DWithin(ST_MakePoint(v.lon, v.lat)::geography,
                     ST_MakePoint(search_lon, search_lat)::geography, radius_meters)
      AND (
            venue_type_filter IS NULL
            OR v.type = venue_type_filter
            -- Phase 12-07: facet-aware widening so a leisure_centre tagged as
            -- soft_play (e.g. Atherton) still surfaces under the Soft Play chip.
            OR (venue_type_filter = 'softplay'         AND v.parent_facets && ARRAY['soft_play']::text[])
            OR (venue_type_filter = 'community_hall'   AND v.parent_facets && ARRAY['hall_hire']::text[])
            OR (venue_type_filter = 'museum'           AND v.parent_facets && ARRAY['museum_programme']::text[])
            OR (venue_type_filter = 'park'             AND v.parent_facets && ARRAY['outdoor_play']::text[])
          )
    ORDER BY
        CASE
            WHEN v.sponsor_tier = 'gold' THEN 1
            WHEN v.sponsor_tier = 'silver' THEN 2
            WHEN v.sponsor_tier = 'bronze' THEN 3
            ELSE 4
        END,
        v.sponsor_priority DESC NULLS LAST,
        v.kid_score DESC NULLS LAST,
        ST_Distance(ST_MakePoint(v.lon, v.lat)::geography,
                    ST_MakePoint(search_lon, search_lat)::geography) ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
