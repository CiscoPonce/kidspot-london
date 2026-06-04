-- Seed verified London Datastore community-centre feed (Cultural Infrastructure Map 2019).
-- Smoke-tested via scripts/maintenance/audit-borough-csv-feeds.ts

INSERT INTO borough_csv_sources (
  borough_name, dataset_name, dataset_url, dataset_type, licence_name, licence_url
) VALUES (
  'Greater London',
  'Community Centres (CIM 2019)',
  'https://data.london.gov.uk/download/2ko88/a8625bba-addb-4fae-a737-244b2281f429/2019%20publication%20-%20Community_centres%20%28Nov%202023%29.csv',
  'community_halls',
  'Open Government Licence',
  'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
)
ON CONFLICT (borough_name, dataset_name) DO UPDATE SET
  dataset_url = EXCLUDED.dataset_url,
  dataset_type = EXCLUDED.dataset_type,
  is_active = TRUE,
  updated_at = NOW();
