-- Phase: live/gone verification + strip invented catering defaults.
-- Rows stay in Postgres. Search hides liveness_status = 'gone'.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS liveness_status TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS liveness_checked_at TIMESTAMPTZ;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS liveness_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liveness_status') THEN
    ALTER TABLE venues
      ADD CONSTRAINT chk_liveness_status
      CHECK (liveness_status IS NULL OR liveness_status IN ('live', 'gone', 'unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_venues_liveness
  ON venues (liveness_status)
  WHERE is_active = TRUE;

-- 039 stamped BYO / food-included onto every hall and soft play.
-- Those were guesses. Keep a value only when a human/crawler note exists.
UPDATE venues
SET
  byo_food_allowed = NULL,
  food_provided = NULL,
  kitchen_facilities = NULL
WHERE catering_notes IS NULL;

-- Drop scrape junk phones so the UI cannot show them.
UPDATE venues
SET phone = NULL
WHERE phone IS NOT NULL
  AND (
    length(regexp_replace(phone, '\D', '', 'g')) < 10
    OR length(regexp_replace(phone, '\D', '', 'g')) > 13
    OR regexp_replace(phone, '\D', '', 'g') ~ '^(00|06)'
    OR regexp_replace(phone, '\D', '', 'g') !~ '^(0|44)'
    OR regexp_replace(phone, '\D', '', 'g') ~ '^(.)\1+$'
    OR regexp_replace(phone, '\D', '', 'g') ~ '(00000|11111|22222|66666|99999|123456)'
  );

-- Hide leftover excluded noise from public search (reversible).
UPDATE venues
SET is_active = FALSE
WHERE is_active = TRUE
  AND venue_scope = 'excluded';

-- OSM objects that no longer exist, or were never a real named place.
UPDATE venues
SET is_active = FALSE
WHERE is_active = TRUE
  AND (
    name ~* '^(test|sample|example|dummy)'
    OR (type <> 'park' AND name ~* '^osm[ _][0-9]+$')
  );

INSERT INTO deactivation_log (venue_id, reason, notes)
SELECT id, 'junk', 'truth cleanup: test/unnamed OSM'
FROM venues
WHERE is_active = FALSE
  AND (
    name ~* '^(test|sample|example|dummy)'
    OR (type <> 'park' AND name ~* '^osm[ _][0-9]+$')
  )
  AND NOT EXISTS (
    SELECT 1 FROM deactivation_log d WHERE d.venue_id = venues.id AND d.reason = 'junk'
  );

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
  AND COALESCE(v.liveness_status, 'unknown') <> 'gone'
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
