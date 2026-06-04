-- Phase 19: Canonical London borough (33 + City of London) for coverage reporting.
-- `borough` keeps the neighbourhood/suburb label from OSM/Nominatim; `london_borough`
-- is the administrative borough parents and SEO pages use.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS london_borough TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_london_borough') THEN
    ALTER TABLE venues
      ADD CONSTRAINT chk_london_borough
      CHECK (london_borough IS NULL OR london_borough IN (
        'Barking and Dagenham', 'Barnet', 'Bexley', 'Brent', 'Bromley', 'Camden',
        'City of London', 'Croydon', 'Ealing', 'Enfield', 'Greenwich', 'Hackney',
        'Hammersmith and Fulham', 'Haringey', 'Harrow', 'Havering', 'Hillingdon',
        'Hounslow', 'Islington', 'Kensington and Chelsea', 'Kingston upon Thames',
        'Lambeth', 'Lewisham', 'Merton', 'Newham', 'Redbridge',
        'Richmond upon Thames', 'Southwark', 'Sutton', 'Tower Hamlets',
        'Waltham Forest', 'Wandsworth', 'Westminster'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_venues_london_borough ON venues (london_borough) WHERE is_active;
