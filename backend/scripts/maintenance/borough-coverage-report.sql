\pset format aligned

SELECT '=== london_borough coverage (active) ===' AS s;
SELECT
  COUNT(*) total,
  COUNT(*) FILTER (WHERE london_borough IS NOT NULL) with_borough,
  COUNT(*) FILTER (WHERE london_borough IS NULL) missing
FROM venues WHERE is_active;

SELECT '=== listable core venues per london_borough ===' AS s;
WITH l AS (
  SELECT london_borough,
    (CASE
       WHEN type IN ('community_hall','softplay')
            AND (website IS NOT NULL AND website<>'' OR phone IS NOT NULL AND phone<>'') THEN TRUE
       WHEN party_capable IS TRUE
            AND (website IS NOT NULL AND website<>'' OR phone IS NOT NULL AND phone<>'') THEN TRUE
       ELSE FALSE END) AS listable
  FROM venues WHERE is_active AND venue_scope='core'
)
SELECT london_borough, COUNT(*) core,
  COUNT(*) FILTER (WHERE listable) listable
FROM l WHERE london_borough IS NOT NULL
GROUP BY london_borough ORDER BY listable DESC;

SELECT '=== neighbourhood vs borough (sample) ===' AS s;
SELECT left(name,35) name, left(borough,22) neighbourhood, london_borough
FROM venues WHERE is_active AND borough IS NOT NULL AND london_borough IS NOT NULL
  AND LOWER(TRIM(borough)) <> LOWER(london_borough)
ORDER BY random() LIMIT 12;
