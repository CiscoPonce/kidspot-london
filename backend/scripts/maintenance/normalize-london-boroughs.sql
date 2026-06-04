-- Phase 19: Populate london_borough from rules + nearest borough centroid (lat/lon).
-- Idempotent. Keeps `borough` as neighbourhood label; sets canonical `london_borough`.
-- Run after migration 028_add_london_borough.sql.

BEGIN;

-- Borough centre points (same as yelp-grid-softplay / londonBoroughs.ts)
CREATE TEMP TABLE borough_centroids (
  name TEXT PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL
);

INSERT INTO borough_centroids (name, lat, lon) VALUES
  ('City of London', 51.5155, -0.0922),
  ('Westminster', 51.4975, -0.1357),
  ('Kensington and Chelsea', 51.5020, -0.1949),
  ('Hammersmith and Fulham', 51.4920, -0.2229),
  ('Wandsworth', 51.4567, -0.1910),
  ('Lambeth', 51.4607, -0.1163),
  ('Southwark', 51.4834, -0.0824),
  ('Tower Hamlets', 51.5099, -0.0237),
  ('Hackney', 51.5450, -0.0553),
  ('Islington', 51.5416, -0.1022),
  ('Camden', 51.5290, -0.1258),
  ('Brent', 51.5588, -0.2817),
  ('Ealing', 51.5130, -0.3089),
  ('Hounslow', 51.4746, -0.3680),
  ('Richmond upon Thames', 51.4479, -0.3260),
  ('Kingston upon Thames', 51.4085, -0.3064),
  ('Merton', 51.4014, -0.1958),
  ('Sutton', 51.3618, -0.1945),
  ('Croydon', 51.3718, -0.0977),
  ('Bromley', 51.3550, 0.0556),
  ('Lewisham', 51.4452, -0.0209),
  ('Greenwich', 51.4892, 0.0648),
  ('Bexley', 51.4549, 0.1505),
  ('Havering', 51.5812, 0.1837),
  ('Barking and Dagenham', 51.5607, 0.1557),
  ('Redbridge', 51.5886, 0.0772),
  ('Newham', 51.5300, 0.0200),
  ('Waltham Forest', 51.5908, -0.0134),
  ('Haringey', 51.5900, -0.1110),
  ('Enfield', 51.6562, -0.0800),
  ('Barnet', 51.6252, -0.2032),
  ('Harrow', 51.5898, -0.3346),
  ('Hillingdon', 51.5441, -0.4760);

-- Step 1: strip "London Borough of …" prefix (exact canonical name after strip)
UPDATE venues v
SET london_borough = TRIM(REGEXP_REPLACE(v.borough, '^London Borough of ', '', 'i'))
WHERE is_active = TRUE
  AND borough IS NOT NULL
  AND borough ~* '^London Borough of ';

-- Step 2: exact canonical borough name in `borough` field (suburb == borough cases)
UPDATE venues v
SET london_borough = bc.name
FROM borough_centroids bc
WHERE v.is_active = TRUE
  AND v.london_borough IS NULL
  AND v.borough IS NOT NULL
  AND LOWER(TRIM(v.borough)) = LOWER(bc.name);

-- Step 3: known aliases (borough field is a shorthand)
UPDATE venues SET london_borough = 'Hammersmith and Fulham'
WHERE is_active AND london_borough IS NULL AND LOWER(TRIM(borough)) IN ('hammersmith', 'fulham');
UPDATE venues SET london_borough = 'Kensington and Chelsea'
WHERE is_active AND london_borough IS NULL AND LOWER(TRIM(borough)) IN ('kensington', 'chelsea');
UPDATE venues SET london_borough = 'Barking and Dagenham'
WHERE is_active AND london_borough IS NULL AND LOWER(TRIM(borough)) IN ('barking', 'dagenham');
UPDATE venues SET london_borough = 'Richmond upon Thames'
WHERE is_active AND london_borough IS NULL AND LOWER(TRIM(borough)) = 'richmond';
UPDATE venues SET london_borough = 'Kingston upon Thames'
WHERE is_active AND london_borough IS NULL AND LOWER(TRIM(borough)) = 'kingston';
UPDATE venues SET london_borough = 'City of London'
WHERE is_active AND london_borough IS NULL AND borough ~* 'city of london';

-- Step 4: nearest borough centroid for all remaining venues with coordinates
UPDATE venues v
SET london_borough = nearest.name
FROM (
  SELECT v2.id,
         (
           SELECT bc.name
           FROM borough_centroids bc
           ORDER BY ST_Distance(
             ST_SetSRID(ST_MakePoint(v2.lon, v2.lat), 4326)::geography,
             ST_SetSRID(ST_MakePoint(bc.lon, bc.lat), 4326)::geography
           )
           LIMIT 1
         ) AS name
  FROM venues v2
  WHERE v2.is_active = TRUE
    AND v2.london_borough IS NULL
    AND v2.lat IS NOT NULL AND v2.lon IS NOT NULL
    AND v2.lat <> 0 AND v2.lon <> 0
) nearest
WHERE v.id = nearest.id;

COMMIT;
