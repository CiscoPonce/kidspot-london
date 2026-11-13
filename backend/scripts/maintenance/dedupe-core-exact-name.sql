-- Hide exact-name core duplicates sitting on the same ~100m grid.
-- Keeps the row with the most contact / party evidence. Reversible via is_active.

BEGIN;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(name)), round(lat::numeric, 3), round(lon::numeric, 3)
      ORDER BY
        (website IS NOT NULL AND website <> '') DESC,
        (phone IS NOT NULL AND phone <> '') DESC,
        (party_capable IS TRUE) DESC,
        (images IS NOT NULL AND cardinality(images) > 0) DESC,
        id ASC
    ) AS rn
  FROM venues
  WHERE is_active = TRUE
    AND venue_scope = 'core'
    AND type IN ('softplay', 'community_hall')
),
deactivated AS (
  UPDATE venues v
  SET is_active = FALSE
  FROM ranked r
  WHERE v.id = r.id
    AND r.rn > 1
  RETURNING v.id
)
INSERT INTO deactivation_log (venue_id, reason, notes)
SELECT id, 'duplicate', 'exact name + 100m grid, keep richer twin'
FROM deactivated;

COMMIT;
