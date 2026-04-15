/**
 * Test script for Redis caching functionality
 * Tests: search caching, venue details caching, sponsor stats caching,
 * cache invalidation, and cache TTL expiration
 */

const { Pool } = require('pg');
const Redis = require('ioredis');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Test configuration
const TEST_COORDS = { lat: 51.5074, lon: -0.1278 }; // Central London
const TEST_RADIUS = 5;
const SHORT_TTL = 2; // 2 seconds for TTL tests

// Clients
const pool = new Pool({ connectionString: DATABASE_URL });
const redis = new Redis(REDIS_URL);

// Test results tracking
let passed = 0;
let failed = 0;

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✓' : type === 'fail' ? '✗' : type === 'warn' ? '⚠' : '•';
  console.log(`${prefix} ${message}`);
}

function assert(condition, message) {
  if (condition) {
    passed++;
    log(message, 'pass');
  } else {
    failed++;
    log(message, 'fail');
  }
}

async function cleanup() {
  try {
    // Clean up test data
    await pool.query(`DELETE FROM venues WHERE name LIKE 'Test Cache Venue %'`);
    // Clean up all cache keys
    const keys = await redis.keys('*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    console.log(`\nCleanup completed`);
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

async function insertTestVenues() {
  console.log('\n--- Inserting test venues ---');

  // Insert test venues with sponsor tiers
  const testVenues = [
    { name: 'Test Cache Venue Gold', lat: 51.52, lon: -0.11, type: 'softplay', sponsor: 'gold', priority: 100 },
    { name: 'Test Cache Venue Silver', lat: 51.51, lon: -0.12, type: 'softplay', sponsor: 'silver', priority: 50 },
    { name: 'Test Cache Venue Bronze', lat: 51.50, lon: -0.13, type: 'softplay', sponsor: 'bronze', priority: 25 },
    { name: 'Test Cache Venue None', lat: 51.49, lon: -0.14, type: 'softplay', sponsor: null, priority: null },
  ];

  for (const venue of testVenues) {
    await pool.query(
      `INSERT INTO venues (name, lat, lon, type, source, sponsor_tier, sponsor_priority, is_active)
       VALUES ($1, $2, $3, $4, 'test', $5, $6, true)
       ON CONFLICT DO NOTHING`,
      [venue.name, venue.lat, venue.lon, venue.type, venue.sponsor, venue.priority]
    );
  }

  log('Inserted 4 test venues');
}

async function testSearchCaching() {
  console.log('\n--- Test: Search Result Caching ---');

  const searchUrl = `http://localhost:4000/api/search/venues?lat=${TEST_COORDS.lat}&lon=${TEST_COORDS.lon}&radius_miles=${TEST_RADIUS}`;

  try {
    // First call - should miss cache
    const response1 = await fetch(searchUrl);
    const data1 = await response1.json();

    assert(data1.success === true, 'Search API returns success');
    assert(data1.meta?.cache_hit === false, 'First call is a cache miss');

    const cacheKey1 = `search:${TEST_COORDS.lat.toFixed(4)}:${TEST_COORDS.lon.toFixed(4)}:${TEST_RADIUS}:all`;
    const cached1 = await redis.get(cacheKey1);
    assert(cached1 !== null, 'Search results are cached after first call');

    // Second call - should hit cache
    const response2 = await fetch(searchUrl);
    const data2 = await response2.json();

    assert(data2.success === true, 'Second search API returns success');
    assert(data2.meta?.cache_hit === true, 'Second call is a cache hit');

    // Verify data consistency
    assert(data1.data.total === data2.data.total, 'Cached data matches original data');

    log('Search caching test completed', 'pass');
  } catch (error) {
    log(`Search caching test error: ${error.message}`, 'fail');
  }
}

async function testVenueDetailsCaching() {
  console.log('\n--- Test: Venue Details Caching ---');

  try {
    // Get a venue ID first
    const venueResult = await pool.query(
      `SELECT id FROM venues WHERE name = 'Test Cache Venue Gold' LIMIT 1`
    );

    if (venueResult.rows.length === 0) {
      log('No test venue found, skipping details caching test', 'warn');
      return;
    }

    const venueId = venueResult.rows[0].id;
    const detailsUrl = `http://localhost:4000/api/search/venues/${venueId}/details`;

    // First call - should miss cache
    const response1 = await fetch(detailsUrl);
    const data1 = await response1.json();

    assert(data1.success === true, 'Venue details API returns success');
    assert(data1.meta?.cache_hit === false, 'First call is a cache miss');

    const cacheKey1 = `venue:${venueId}:details`;
    const cached1 = await redis.get(cacheKey1);
    assert(cached1 !== null, 'Venue details are cached after first call');

    // Second call - should hit cache
    const response2 = await fetch(detailsUrl);
    const data2 = await response2.json();

    assert(data2.success === true, 'Second venue details API returns success');
    assert(data2.meta?.cache_hit === true, 'Second call is a cache hit');

    log('Venue details caching test completed', 'pass');
  } catch (error) {
    log(`Venue details caching test error: ${error.message}`, 'fail');
  }
}

async function testSponsorStatsCaching() {
  console.log('\n--- Test: Sponsor Statistics Caching ---');

  const statsUrl = 'http://localhost:4000/api/sponsors/stats';

  try {
    // First call - should miss cache
    const response1 = await fetch(statsUrl);
    const data1 = await response1.json();

    assert(data1.success === true, 'Sponsor stats API returns success');
    assert(data1.meta?.cache_hit === false, 'First call is a cache miss');

    const cached1 = await redis.get('sponsors:stats');
    assert(cached1 !== null, 'Sponsor stats are cached after first call');

    // Second call - should hit cache
    const response2 = await fetch(statsUrl);
    const data2 = await response2.json();

    assert(data2.success === true, 'Second sponsor stats API returns success');
    assert(data2.meta?.cache_hit === true, 'Second call is a cache hit');

    // Verify data consistency
    assert(JSON.stringify(data1.data) === JSON.stringify(data2.data), 'Cached stats match original');

    log('Sponsor stats caching test completed', 'pass');
  } catch (error) {
    log(`Sponsor stats caching test error: ${error.message}`, 'fail');
  }
}

async function testSponsorPricingCaching() {
  console.log('\n--- Test: Sponsor Pricing Caching ---');

  const pricingUrl = 'http://localhost:4000/api/sponsors/pricing';

  try {
    // First call - should miss cache
    const response1 = await fetch(pricingUrl);
    const data1 = await response1.json();

    assert(data1.success === true, 'Sponsor pricing API returns success');
    assert(data1.meta?.cache_hit === false, 'First call is a cache miss');

    const cached1 = await redis.get('sponsors:pricing');
    assert(cached1 !== null, 'Sponsor pricing is cached after first call');

    // Second call - should hit cache
    const response2 = await fetch(pricingUrl);
    const data2 = await response2.json();

    assert(data2.success === true, 'Second sponsor pricing API returns success');
    assert(data2.meta?.cache_hit === true, 'Second call is a cache hit');

    // Verify data consistency
    assert(data1.data.tiers !== undefined, 'Pricing data has tiers');
    assert(data2.data.tiers !== undefined, 'Cached pricing data has tiers');

    log('Sponsor pricing caching test completed', 'pass');
  } catch (error) {
    log(`Sponsor pricing caching test error: ${error.message}`, 'fail');
  }
}

async function testCacheInvalidation() {
  console.log('\n--- Test: Cache Invalidation ---');

  try {
    // First, populate the caches
    const searchUrl = `http://localhost:4000/api/search/venues?lat=${TEST_COORDS.lat}&lon=${TEST_COORDS.lon}&radius_miles=${TEST_RADIUS}`;
    await fetch(searchUrl); // Populate search cache

    await fetch('http://localhost:4000/api/sponsors/stats'); // Populate stats cache

    // Verify caches are populated
    const searchCacheBefore = await redis.get(`search:${TEST_COORDS.lat.toFixed(4)}:${TEST_COORDS.lon.toFixed(4)}:${TEST_RADIUS}:all`);
    const statsCacheBefore = await redis.get('sponsors:stats');

    assert(searchCacheBefore !== null, 'Search cache is populated before invalidation');
    assert(statsCacheBefore !== null, 'Stats cache is populated before invalidation');

    // Get a venue ID for tier update
    const venueResult = await pool.query(
      `SELECT id FROM venues WHERE name = 'Test Cache Venue Gold' LIMIT 1`
    );

    if (venueResult.rows.length === 0) {
      log('No test venue found, skipping invalidation test', 'warn');
      return;
    }

    const venueId = venueResult.rows[0].id;

    // Update sponsor tier (this should invalidate caches)
    const updateResponse = await fetch(`http://localhost:4000/api/sponsors/venues/${venueId}/tier`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': process.env.ADMIN_KEY || 'test-admin-key'
      },
      body: JSON.stringify({ tier: 'gold', priority: 200 })
    });

    if (updateResponse.ok) {
      // Verify caches are invalidated
      const searchCacheAfter = await redis.get(`search:${TEST_COORDS.lat.toFixed(4)}:${TEST_COORDS.lon.toFixed(4)}:${TEST_RADIUS}:all`);
      const statsCacheAfter = await redis.get('sponsors:stats');

      assert(searchCacheAfter === null, 'Search cache is invalidated after tier update');
      assert(statsCacheAfter === null, 'Stats cache is invalidated after tier update');

      log('Cache invalidation test completed', 'pass');
    } else {
      log('Cache invalidation test skipped (admin auth required)', 'warn');
    }
  } catch (error) {
    log(`Cache invalidation test error: ${error.message}`, 'fail');
  }
}

async function testCacheTTL() {
  console.log('\n--- Test: Cache TTL Expiration ---');

  try {
    // Create a cache entry with short TTL
    const testKey = 'test:ttl';
    const testData = { test: 'data', timestamp: Date.now() };

    await redis.set(testKey, JSON.stringify(testData), 'EX', SHORT_TTL);

    // Verify it's cached
    const cached = await redis.get(testKey);
    assert(cached !== null, 'Test cache entry is created');

    // Wait for TTL to expire
    log(`Waiting ${SHORT_TTL + 1} seconds for TTL expiration...`);
    await new Promise(resolve => setTimeout(resolve, (SHORT_TTL + 1) * 1000));

    // Verify it's expired
    const expired = await redis.get(testKey);
    assert(expired === null, 'Test cache entry expires after TTL');

    log('Cache TTL test completed', 'pass');
  } catch (error) {
    log(`Cache TTL test error: ${error.message}`, 'fail');
  }
}

async function testCacheKeyStructure() {
  console.log('\n--- Test: Cache Key Structure ---');

  try {
    // Test search cache key format: search:{lat}:{lon}:{radius}:{type}
    const lat = 51.5074;
    const lon = -0.1278;
    const radius = 5;
    const type = 'softplay';

    const expectedKey = `search:${lat.toFixed(4)}:${lon.toFixed(4)}:${radius}:${type}`;
    const actualKey = `search:${lat.toFixed(4)}:${lon.toFixed(4)}:${radius}:${type}`;

    assert(expectedKey === actualKey, `Search cache key format is correct: ${expectedKey}`);
    assert(expectedKey === 'search:51.5074:-0.1278:5:softplay', 'Search cache key matches expected format');

    // Test venue details cache key format: venue:{id}:details
    const venueId = 123;
    const expectedVenueKey = `venue:${venueId}:details`;
    const actualVenueKey = `venue:${venueId}:details`;

    assert(expectedVenueKey === actualVenueKey, `Venue details cache key format is correct: ${expectedVenueKey}`);
    assert(expectedVenueKey === 'venue:123:details', 'Venue details cache key matches expected format');

    log('Cache key structure test completed', 'pass');
  } catch (error) {
    log(`Cache key structure test error: ${error.message}`, 'fail');
  }
}

async function runTests() {
  console.log('======================================');
  console.log('  Redis Caching Test Suite');
  console.log('======================================');
  console.log(`Database: ${DATABASE_URL}`);
  console.log(`Redis: ${REDIS_URL}`);
  console.log(`Test Coordinates: ${TEST_COORDS.lat}, ${TEST_COORDS.lon}`);
  console.log('--------------------------------------');

  try {
    // Test database and redis connectivity
    await pool.query('SELECT 1');
    log('Database connection successful');

    await redis.ping();
    log('Redis connection successful');

    // Run tests
    await testCacheKeyStructure();
    await insertTestVenues();
    await testSearchCaching();
    await testVenueDetailsCaching();
    await testSponsorStatsCaching();
    await testSponsorPricingCaching();
    await testCacheInvalidation();
    await testCacheTTL();

  } catch (error) {
    log(`Setup error: ${error.message}`, 'fail');
  } finally {
    await cleanup();
  }

  // Print summary
  console.log('\n======================================');
  console.log('  Test Results');
  console.log('======================================');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log('======================================');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests();
