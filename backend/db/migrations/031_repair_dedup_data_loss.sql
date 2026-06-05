-- Migration 031: Repair Deduplication Data Loss
--
-- Restores type, parent_facets, features, and editor_locked status to active venues
-- that had their duplicates deactivated in the deduplication sweep.
-- Also merges ratings, kid_score, price_level, party data, and trust signals.
-- Then, re-runs the venue scope classifier to ensure repaired venues are in 'core'.

BEGIN;

-- 1) Perform the repair
WITH dupe_aggregated AS (
  SELECT 
    v_kept.id as kept_id, 
    -- Pick the first specific type if any exist
    (
      SELECT v_deact.type 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
        AND v_deact.type IN ('softplay', 'community_hall')
      LIMIT 1
    ) as deact_type,
    
    -- Pick the highest rating / user_ratings_total / price_level / kid_score
    (
      SELECT v_deact.rating 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.rating IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      ORDER BY rating DESC LIMIT 1
    ) as deact_rating,
    
    (
      SELECT v_deact.user_ratings_total 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.user_ratings_total IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      ORDER BY user_ratings_total DESC LIMIT 1
    ) as deact_user_ratings_total,

    (
      SELECT v_deact.price_level 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.price_level IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_price_level,

    (
      SELECT v_deact.kid_score 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.kid_score IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      ORDER BY kid_score DESC LIMIT 1
    ) as deact_kid_score,
    
    -- Pick first non-null party fields from deactivated
    (
      SELECT v_deact.party_capable 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_capable IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_capable,

    (
      SELECT v_deact.party_price_from 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_price_from IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_price_from,

    (
      SELECT v_deact.party_price_unit 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_price_unit IS NOT NULL AND v_deact.party_price_unit != ''
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_price_unit,

    (
      SELECT v_deact.party_max_capacity 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_max_capacity IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_max_capacity,

    (
      SELECT v_deact.party_packages 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_packages IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_packages,

    (
      SELECT v_deact.party_enquiry_url 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_enquiry_url IS NOT NULL AND v_deact.party_enquiry_url != ''
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_enquiry_url,

    (
      SELECT v_deact.party_source 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_source IS NOT NULL AND v_deact.party_source != ''
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_source,

    (
      SELECT v_deact.party_extracted_at 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.party_extracted_at IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_party_extracted_at,

    (
      SELECT v_deact.fhrs_establishment_id 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND v_deact.fhrs_establishment_id IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      LIMIT 1
    ) as deact_fhrs_establishment_id,

    -- Check if any duplicate is locked
    EXISTS (
      SELECT 1 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
        AND v_deact.editor_locked = TRUE
    ) as deact_locked
  FROM venues v_kept
  WHERE v_kept.is_active = TRUE
    -- Only match venues that have at least one deactivated duplicate within 200m
    AND EXISTS (
      SELECT 1 
      FROM venues v_deact 
      WHERE (v_kept.name = v_deact.name OR levenshtein(lower(v_kept.name), lower(v_deact.name)) <= 2)
        AND v_kept.id != v_deact.id
        AND v_deact.is_active = FALSE
        AND ST_DWithin(ST_MakePoint(v_kept.lon, v_kept.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
    )
)
UPDATE venues v
SET 
  type = CASE 
    WHEN v.type NOT IN ('softplay', 'community_hall') AND da.deact_type IN ('softplay', 'community_hall') THEN da.deact_type 
    ELSE v.type 
  END,
  parent_facets = (
    SELECT ARRAY(
      SELECT DISTINCT x 
      FROM (
        SELECT unnest(v.parent_facets) x
        UNION ALL
        SELECT unnest(v_deact.parent_facets) x
        FROM venues v_deact
        WHERE (v.name = v_deact.name OR levenshtein(lower(v.name), lower(v_deact.name)) <= 2)
          AND v.id != v_deact.id
          AND v_deact.is_active = FALSE
          AND ST_DWithin(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      ) sub 
      WHERE x IS NOT NULL
    )
  ),
  features = (
    SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
    FROM (
      SELECT DISTINCT x FROM (
        SELECT jsonb_array_elements(COALESCE(v.features, '[]'::jsonb)) x
        UNION ALL
        SELECT jsonb_array_elements(COALESCE(v_deact.features, '[]'::jsonb)) x
        FROM venues v_deact
        WHERE (v.name = v_deact.name OR levenshtein(lower(v.name), lower(v_deact.name)) <= 2)
          AND v.id != v_deact.id
          AND v_deact.is_active = FALSE
          AND ST_DWithin(ST_MakePoint(v.lon, v.lat)::geography, ST_MakePoint(v_deact.lon, v_deact.lat)::geography, 200)
      ) sub
    ) sub2
  ),
  
  -- Merge Ratings & Scores
  rating = COALESCE(v.rating, da.deact_rating),
  user_ratings_total = COALESCE(v.user_ratings_total, da.deact_user_ratings_total),
  price_level = COALESCE(v.price_level, da.deact_price_level),
  kid_score = CASE WHEN COALESCE(v.kid_score, 0) = 0 THEN COALESCE(da.deact_kid_score, v.kid_score) ELSE v.kid_score END,
  
  -- Merge Party Data
  party_capable = COALESCE(v.party_capable, da.deact_party_capable),
  party_price_from = COALESCE(v.party_price_from, da.deact_party_price_from),
  party_price_unit = COALESCE(NULLIF(v.party_price_unit, ''), da.deact_party_price_unit),
  party_max_capacity = COALESCE(v.party_max_capacity, da.deact_party_max_capacity),
  party_packages = COALESCE(v.party_packages, da.deact_party_packages),
  party_enquiry_url = COALESCE(NULLIF(v.party_enquiry_url, ''), da.deact_party_enquiry_url),
  party_source = COALESCE(NULLIF(v.party_source, ''), da.deact_party_source),
  party_extracted_at = COALESCE(v.party_extracted_at, da.deact_party_extracted_at),
  
  -- Merge Trust & Lock status
  fhrs_establishment_id = COALESCE(v.fhrs_establishment_id, da.deact_fhrs_establishment_id),
  editor_locked = v.editor_locked OR da.deact_locked
FROM dupe_aggregated da
WHERE v.id = da.kept_id;

-- 2) Re-classify all active venues (copied from classify-venue-scope.sql)
UPDATE venues SET venue_scope = NULL, scope_reason = NULL WHERE is_active = TRUE;

WITH classified AS (
  SELECT
    id,
    CASE
      WHEN name IS NULL OR length(trim(name)) < 4
           OR name ~* '^(test|sample|example|dummy)'
        THEN ARRAY['excluded','junk']
      WHEN type <> 'park' AND name ~* '^osm[ _][0-9]+$'
        THEN ARRAY['excluded','osm_unnamed']
      WHEN party_capable IS TRUE
        THEN ARRAY['core','party_confirmed']
      WHEN name ~* '(community hall|community centre|community center|memorial hall|village hall|church hall|parish hall|scout (hut|hall)|guide hall|masonic hall|women.?s institute|\yw\.?i\.? hall|clubhouse|tenants.{0,3}hall|community room|civic hall)'
        THEN ARRAY['core','hall_hire_name']
      WHEN type = 'softplay'        THEN ARRAY['core','softplay']
      WHEN type = 'community_hall'  THEN ARRAY['core','community_hall']
      WHEN parent_facets && ARRAY['hall_hire','party_hire','soft_play']::text[]
        THEN ARRAY['core','party_facet']
      WHEN type = 'museum' AND parent_facets && ARRAY['museum_programme']::text[]
        THEN ARRAY['core','museum_programme']
      WHEN type = 'museum'
        THEN ARRAY['review','museum_other']
      WHEN type = 'leisure_centre'
           AND name ~* '(soft ?play|trampolin|bounce|inflatable|play ?(centre|center)|\ykids\y|children|junior|\yparty\y|climbing|laser ?tag|adventure)'
        THEN ARRAY['core','leisure_kids_signal']
      WHEN name ~* '(pure ?gym|gym group|fitness first|virgin active|nuffield health|everlast|snap fitness|\yjd gym\y|david lloyd|anytime fitness|\yf45\y)'
           AND name !~* '(kids|children|junior|family|\yplay\y|party)'
        THEN ARRAY['excluded','adult_gym']
      WHEN type IN ('leisure_centre','other')
           AND name ~* '(\yyoga\y|pilates|\ybarre\y|reformer|crossfit|cross ?fit|spin studio|spinning studio|health club|women.?s fitness|men.?s fitness|\yhiit\y|bikram|\yspa\y)'
           AND name !~* '(kids|children|junior|family|\yplay\y|party|\ysoft\y)'
        THEN ARRAY['excluded','adult_fitness']
      WHEN name ~* '(waterstones|\yikea\y|breitling|\ytesco\y|sainsbury|\yasda\y|morrisons|supermarket|\yretail\y|filmstore|estate agent|\yncp\y|car park)'
        THEN ARRAY['excluded','retail']
      WHEN name ~* '(\yclinic\y|dental|\yphysio|\yhospital\y|gp surgery|medical (centre|center)|intermediate care|pharmacy)'
        THEN ARRAY['excluded','health']
      WHEN name ~* '(\ychurch\y|parish church|\ymosque\y|synagogue|\ytemple\y|gurdwara|cathedral|\ychapel\y)'
           AND name !~* '(hall|community|centre|center|\yhire\y|\yroom\y|\yclub\y)'
        THEN ARRAY['excluded','worship_only']
      WHEN parent_facets && ARRAY['activity_session']::text[]
           AND NOT parent_facets && ARRAY['hall_hire','party_hire','soft_play']::text[]
        THEN ARRAY['excluded','activity_class']
      WHEN name ~* '(dance (school|class|academy)|ballet (school|class)|music school|stage school|drama school|performing arts|theatre school|tuition|tutoring|tutor (centre|center)|martial arts|\ykarate\y|taekwondo|\yjudo\y|kickboxing|swim school|swimming lesson)'
           AND type <> 'community_hall'
           AND NOT parent_facets && ARRAY['hall_hire']::text[]
        THEN ARRAY['excluded','activity_class']
      WHEN type = 'park' THEN ARRAY['secondary','park_outdoor']
      WHEN type IN ('library','cafe')   THEN ARRAY['review', type]
      WHEN type = 'leisure_centre'      THEN ARRAY['review','leisure_unclassified']
      WHEN type = 'other'               THEN ARRAY['review','other_unclassified']
      ELSE ARRAY['review','unclassified']
    END AS res
  FROM venues
  WHERE is_active = TRUE
)
UPDATE venues v
SET venue_scope = c.res[1], scope_reason = c.res[2]
FROM classified c
WHERE v.id = c.id;

COMMIT;
