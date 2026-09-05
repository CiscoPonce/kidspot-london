-- Phase 19: Venue scope classifier (idempotent, re-runnable).
-- Recomputes venue_scope + scope_reason for every ACTIVE venue from scratch.
-- Pure classification: NO deactivation, NO URL changes. Safe to run repeatedly.
--
-- Priority order matters (first matching rule wins). Confirmed party data and
-- explicit hall naming beat type defaults; obvious noise is excluded last so a
-- "X Community Hall" mislabeled as 'other' still lands in core.

UPDATE venues SET venue_scope = NULL, scope_reason = NULL WHERE is_active = TRUE;

WITH classified AS (
  SELECT
    id,
    CASE
      ------------------------------------------------------------------ junk
      WHEN name IS NULL OR length(trim(name)) < 4
           OR name ~* '^(test|sample|example|dummy)'
        THEN ARRAY['excluded','junk']

      ----------------------------------- unnamed OSM nodes (non-park only)
      WHEN type <> 'park' AND name ~* '^osm[ _][0-9]+$'
        THEN ARRAY['excluded','osm_unnamed']

      ------------------------------------------------ confirmed by 18D crawl
      WHEN party_capable IS TRUE
        THEN ARRAY['core','party_confirmed']

      ------------------------------------ halls hiding under any type/name
      WHEN name ~* '(community hall|community centre|community center|memorial hall|village hall|church hall|parish hall|scout (hut|hall)|guide hall|masonic hall|women.?s institute|\yw\.?i\.? hall|clubhouse|tenants.{0,3}hall|community room|civic hall)'
        THEN ARRAY['core','hall_hire_name']

      ----------------------------------------------------- core by type
      WHEN type = 'softplay'        THEN ARRAY['core','softplay']
      WHEN type = 'community_hall'  THEN ARRAY['core','community_hall']

      ---------------------------------------------------- core by facet
      WHEN parent_facets && ARRAY['hall_hire','party_hire','soft_play']::text[]
        THEN ARRAY['core','party_facet']

      ------------------------------------------------- museum programmes
      WHEN type = 'museum' AND parent_facets && ARRAY['museum_programme']::text[]
        THEN ARRAY['core','museum_programme']
      WHEN type = 'museum'
        THEN ARRAY['review','museum_other']

      ------------------------- leisure centre WITH explicit kids/party signal
      WHEN type = 'leisure_centre'
           AND name ~* '(soft ?play|trampolin|bounce|inflatable|play ?(centre|center)|\ykids\y|children|junior|\yparty\y|climbing|laser ?tag|adventure)'
        THEN ARRAY['core','leisure_kids_signal']

      ---- Better Gym / GLL leisure centres (softplay + party hire on site)
      WHEN type IN ('leisure_centre', 'softplay', 'other')
           AND name ~* '(better gym|better leisure|greenwich leisure|\yatherton leisure centre\y)'
        THEN ARRAY['core','better_gym_leisure']

      ----------------------------------------------- EXCLUDE: adult gyms
      WHEN name ~* '(pure ?gym|gym group|fitness first|virgin active|nuffield health|everlast|snap fitness|\yjd gym\y|david lloyd|anytime fitness|\yf45\y)'
           AND name !~* '(kids|children|junior|family|\yplay\y|party)'
        THEN ARRAY['excluded','adult_gym']

      --------------------------- EXCLUDE: adult fitness studios (tightened)
      WHEN type IN ('leisure_centre','other')
           AND name ~* '(\yyoga\y|pilates|\ybarre\y|reformer|crossfit|cross ?fit|spin studio|spinning studio|health club|women.?s fitness|men.?s fitness|\yhiit\y|bikram|\yspa\y)'
           AND name !~* '(kids|children|junior|family|\yplay\y|party|\ysoft\y)'
        THEN ARRAY['excluded','adult_fitness']

      ----------------------------------------------- EXCLUDE: retail/brand
      WHEN name ~* '(waterstones|\yikea\y|breitling|\ytesco\y|sainsbury|\yasda\y|morrisons|supermarket|\yretail\y|filmstore|estate agent|\yncp\y|car park)'
        THEN ARRAY['excluded','retail']

      ----------------------------------------------- EXCLUDE: health/clinic
      WHEN name ~* '(\yclinic\y|dental|\yphysio|\yhospital\y|gp surgery|medical (centre|center)|intermediate care|pharmacy)'
        THEN ARRAY['excluded','health']

      ------------------------------------------- EXCLUDE: worship-only
      WHEN name ~* '(\ychurch\y|parish church|\ymosque\y|synagogue|\ytemple\y|gurdwara|cathedral|\ychapel\y)'
           AND name !~* '(hall|community|centre|center|\yhire\y|\yroom\y|\yclub\y)'
        THEN ARRAY['excluded','worship_only']

      ------------------------------------ EXCLUDE: classes/sessions (not hire)
      WHEN parent_facets && ARRAY['activity_session']::text[]
           AND NOT parent_facets && ARRAY['hall_hire','party_hire','soft_play']::text[]
        THEN ARRAY['excluded','activity_class']
      WHEN name ~* '(dance (school|class|academy)|ballet (school|class)|music school|stage school|drama school|performing arts|theatre school|tuition|tutoring|tutor (centre|center)|martial arts|\ykarate\y|taekwondo|\yjudo\y|kickboxing|swim school|swimming lesson)'
           AND type <> 'community_hall'
           AND NOT parent_facets && ARRAY['hall_hire']::text[]
        THEN ARRAY['excluded','activity_class']

      ---------------------------------------------- SECONDARY: parks
      WHEN type = 'park' THEN ARRAY['secondary','park_outdoor']

      ------------------------------------------- CORE: chain softplay
      WHEN name ~* '(flip out|gambado|kidspace|oxygen active|oxygen freejump|inflata nation|airhop|jump giant|jump in trampoline|gravity max|gravity active|ninja warrior|\ybabylon park\y|better extreme|clip n climb|inflata)'
        THEN ARRAY['core','chain_softplay']

      -------------------------- REVIEW: fast food (keep rows, hide from search)
      WHEN name ~* '(mcdonald|burger king|pizza hut party|wacky warehouse|brewers fayre|beefeater party)'
        THEN ARRAY['review','chain_party_food']

      ---------------------------------------------- REVIEW: ambiguous
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

UPDATE venues SET type = 'softplay'
WHERE is_active = TRUE AND scope_reason = 'chain_softplay' AND type NOT IN ('softplay');

UPDATE venues SET type = COALESCE(NULLIF(type,'unknown'), 'other')
WHERE is_active = TRUE AND scope_reason = 'chain_party_food';
