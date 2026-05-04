-- Migration 012: Seed Atherton Leisure Centre as a soft-play venue.
--
-- Atherton Leisure Centre (E15 4JF, Newham) is operated by Better / Greenwich
-- Leisure Limited and hosts soft-play sessions, party hire, and a cafe. It
-- exists in OpenStreetMap as way 144138520 with the tag
-- `leisure=fitness_centre, sport=multi`, so our discovery pipeline's
-- `leisure=indoor_play` query never picks it up. Seed it manually so the
-- soft-play filter returns a real, close result for E15 postcodes — the
-- broader OSM softplay query refresh in `venueService.ts` covers other
-- council leisure centres going forward.

INSERT INTO venues (
  name,
  lat,
  lon,
  type,
  source,
  source_id,
  borough,
  slug,
  features,
  enriched_at,
  kid_score,
  is_active
) VALUES (
  'Atherton Leisure Centre',
  51.5448339,
  0.0151691,
  'softplay',
  'manual',
  'atherton-leisure-centre',
  'Newham',
  'atherton-leisure-centre',
  '["soft_play","party_hire","cafe","parking"]'::jsonb,
  NOW(),
  7.5,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;
