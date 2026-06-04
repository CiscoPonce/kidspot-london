-- Phase 19: Moderate cleanup (transactional). Run AFTER the tightened classifier.
-- Reversible notes:
--   * re-type halls : identifiable by scope_reason='hall_hire_name'
--   * deactivate     : reactivate with  UPDATE venues SET is_active=TRUE WHERE venue_scope='excluded';
--   * null URLs      : only Yelp/placeholder URLs (known-dead) are cleared.

BEGIN;

-- 1) Re-type mislabeled halls: 'other' rows that are clearly community halls by name.
UPDATE venues
SET type = 'community_hall'
WHERE is_active = TRUE
  AND type = 'other'
  AND venue_scope = 'core'
  AND scope_reason = 'hall_hire_name';

-- 2) Null unusable softplay website URLs (dead Yelp + placeholder) so the UI
--    stops linking to them and the crawler stops wasting calls.
UPDATE venues
SET website = NULL
WHERE is_active = TRUE
  AND type = 'softplay'
  AND (website ILIKE '%yelp.%' OR website ILIKE '%example%');

-- 3) Deactivate excluded noise (adult gyms/fitness, retail, clinics, worship-only,
--    classes-only, unnamed OSM nodes, junk). Fully reversible by venue_scope.
UPDATE venues
SET is_active = FALSE
WHERE is_active = TRUE
  AND venue_scope = 'excluded';

COMMIT;
