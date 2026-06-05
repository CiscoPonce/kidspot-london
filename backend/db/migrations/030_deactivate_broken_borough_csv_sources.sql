-- Deactivate borough CSV feeds that return 404 (smoke-tested 2026-06-04).
UPDATE borough_csv_sources
SET is_active = FALSE, updated_at = NOW()
WHERE dataset_url LIKE '%ce44a658-fbdc-4d28-a9e8-132f07f4bea4%';
