-- Test script for minimal schema spatial functionality
-- This script validates that PostGIS is working correctly with the lean database approach

-- Test 1: Insert sample venue (minimal data)
INSERT INTO venues (source, source_id, name, type, lat, lon)
VALUES ('test', 'test_1', 'Test Soft Play Centre', 'softplay', 51.5074, -0.1278);

-- Test 2: Insert another sample venue
INSERT INTO venues (source, source_id, name, type, lat, lon)
VALUES ('test', 'test_2', 'Test Community Hall', 'community_hall', 51.5084, -0.1288);

-- Test 3: Insert a venue that should be detected as duplicate
INSERT INTO venues (source, source_id, name, type, lat, lon)
VALUES ('test', 'test_3', 'Test Soft Play Centre', 'softplay', 51.5075, -0.1279);

-- Test 4: Insert a sponsored venue (gold tier)
INSERT INTO venues (source, source_id, name, type, lat, lon, sponsor_tier, sponsor_priority)
VALUES ('test', 'test_4', 'Sponsored Play Centre', 'softplay', 51.5094, -0.1298, 'gold', 100);

-- Test 5: Insert a sponsored venue (silver tier)
INSERT INTO venues (source, source_id, name, type, lat, lon, sponsor_tier, sponsor_priority)
VALUES ('test', 'test_5', 'Sponsored Community Hall', 'community_hall', 51.5095, -0.1299, 'silver', 50);

-- Test 6: Query venues within 5 miles of central London
SELECT 'Test 6: Venues within 5 miles' as test_name;
SELECT id, name, type, source,
  ST_Distance(ST_MakePoint(lon, lat)::geography, ST_MakePoint(-0.1278, 51.5074)::geography) / 1609.34 AS distance_miles,
  sponsor_tier
FROM venues
WHERE source = 'test'
  AND ST_DWithin(ST_MakePoint(lon, lat)::geography, ST_MakePoint(-0.1278, 51.5074)::geography, 8046.72) -- 5 miles in meters
ORDER BY distance_miles ASC;

-- Test 7: Test deduplication function with duplicate
SELECT 'Test 7: Deduplication check (should return true)' as test_name;
SELECT is_duplicate_venue('Test Soft Play Centre', 51.5074, -0.1278);

-- Test 8: Test deduplication function with non-duplicate
SELECT 'Test 8: Deduplication check (should return false)' as test_name;
SELECT is_duplicate_venue('Completely Different Venue Name', 51.5074, -0.1278);

-- Test 9: Test search_venues_by_radius function
SELECT 'Test 9: Search by radius function' as test_name;
SELECT * FROM search_venues_by_radius(51.5074, -0.1278, 8046.72, NULL, 10);

-- Test 10: Test search_venues_by_radius with type filter
SELECT 'Test 10: Search by radius with type filter (softplay)' as test_name;
SELECT * FROM search_venues_by_radius(51.5074, -0.1278, 8046.72, 'softplay', 10);

-- Test 11: Test sponsor ranking in search results
SELECT 'Test 11: Sponsor ranking (gold should appear first)' as test_name;
SELECT name, type, sponsor_tier, sponsor_priority, distance_miles
FROM search_venues_by_radius(51.5074, -0.1278, 8046.72, NULL, 10);

-- Test 12: Test insert_venue_if_not_duplicate function (should insert new)
SELECT 'Test 12: Insert venue if not duplicate (should insert)' as test_name;
SELECT insert_venue_if_not_duplicate(
    'test',
    'test_6',
    'New Test Venue',
    'park',
    51.5104,
    -0.1308
);

-- Test 13: Test insert_venue_if_not_duplicate function (should return existing ID)
SELECT 'Test 13: Insert venue if not duplicate (should return existing ID)' as test_name;
SELECT insert_venue_if_not_duplicate(
    'test',
    'test_7',
    'Test Soft Play Centre',
    'softplay',
    51.5074,
    -0.1278
);

-- Test 14: Verify all test venues were inserted
SELECT 'Test 14: Count of test venues' as test_name;
SELECT COUNT(*) as venue_count FROM venues WHERE source = 'test';

-- Test 15: Verify indexes exist
SELECT 'Test 15: Check indexes exist' as test_name;
SELECT indexname, tablename FROM pg_indexes WHERE tablename = 'venues';

-- Test 16: Verify PostGIS extension is enabled
SELECT 'Test 16: PostGIS extension status' as test_name;
SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';

-- Test 17: Verify fuzzystrmatch extension is enabled
SELECT 'Test 17: fuzzystrmatch extension status' as test_name;
SELECT extname, extversion FROM pg_extension WHERE extname = 'fuzzystrmatch';

-- Test 18: Test update_venue_scrape_time function
SELECT 'Test 18: Update venue scrape time' as test_name;
SELECT update_venue_scrape_time(1);
SELECT id, name, last_scraped FROM venues WHERE id = 1;

-- Test 19: Test deactivate_venue function
SELECT 'Test 19: Deactivate venue' as test_name;
SELECT deactivate_venue(2);
SELECT id, name, is_active FROM venues WHERE id = 2;

-- Test 20: Test get_venues_needing_scrape function
SELECT 'Test 20: Get venues needing scrape' as test_name;
SELECT * FROM get_venues_needing_scrape(24);

-- Test 21: Test update_sponsor_tier function
SELECT 'Test 21: Update sponsor tier' as test_name;
SELECT update_sponsor_tier(1, 'silver', 75);
SELECT id, name, sponsor_tier, sponsor_priority FROM venues WHERE id = 1;

-- Test 22: Test get_sponsor_stats function
SELECT 'Test 22: Get sponsor statistics' as test_name;
SELECT * FROM get_sponsor_stats();

-- Test 23: Verify spatial location calculation works
SELECT 'Test 23: Spatial location calculation' as test_name;
SELECT name, lat, lon,
  ST_Distance(ST_MakePoint(lon, lat)::geography, ST_MakePoint(-0.1278, 51.5074)::geography) / 1609.34 AS distance_miles
FROM venues
WHERE source = 'test'
LIMIT 5;

-- Test 24: Test that inactive venues are excluded from search
SELECT 'Test 24: Inactive venues excluded from search' as test_name;
SELECT COUNT(*) as active_count FROM venues WHERE is_active = TRUE AND source = 'test';
SELECT COUNT(*) as inactive_count FROM venues WHERE is_active = FALSE AND source = 'test';

-- Test 25: Test sponsor priority ordering within same tier
SELECT 'Test 25: Sponsor priority ordering' as test_name;
-- Insert two more gold tier venues with different priorities
INSERT INTO venues (source, source_id, name, type, lat, lon, sponsor_tier, sponsor_priority)
VALUES ('test', 'test_8', 'Gold Venue High Priority', 'softplay', 51.5114, -0.1318, 'gold', 200);
INSERT INTO venues (source, source_id, name, type, lat, lon, sponsor_tier, sponsor_priority)
VALUES ('test', 'test_9', 'Gold Venue Low Priority', 'softplay', 51.5115, -0.1319, 'gold', 10);

SELECT name, sponsor_tier, sponsor_priority, distance_miles
FROM search_venues_by_radius(51.5074, -0.1278, 16093.44, NULL, 10)
WHERE sponsor_tier = 'gold';

-- Cleanup: Remove all test data
-- Uncomment the following lines to clean up test data
-- DELETE FROM venues WHERE source = 'test';
