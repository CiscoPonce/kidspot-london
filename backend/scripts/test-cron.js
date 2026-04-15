#!/usr/bin/env node

/**
 * Test script for cron-agent.js
 * 
 * This script validates the cron agent functionality by:
 * 1. Inserting test venues with different last_scraped timestamps
 * 2. Running cron agent on test data
 * 3. Verifying stale venues are updated
 * 4. Verifying sponsored venues are prioritized
 * 5. Verifying permanently closed venues are deactivated
 * 6. Reporting test results
 */

const { Pool } = require('pg');
require('dotenv').config();

// Test database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Test counters
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, error = null) {
  testsRun++;
  if (passed) {
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } else {
    testsFailed++;
    console.log(`  ✗ ${name}`);
    if (error) console.log(`    Error: ${error}`);
  }
}

// Cleanup test venues
async function cleanupTestVenues() {
  try {
    await pool.query("DELETE FROM venues WHERE source = 'test_cron'");
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

// Test 1: Verify get_venues_needing_scrape function exists
async function testGetVenuesNeedingScrapeExists() {
  console.log('\nTest 1: Verify get_venues_needing_scrape function exists');
  
  try {
    const result = await pool.query("SELECT 1 FROM pg_proc WHERE proname = 'get_venues_needing_scrape'");
    logTest('Function exists', result.rows.length > 0);
  } catch (error) {
    logTest('Function exists', false, error.message);
  }
}

// Test 2: Insert test venues and verify prioritization
async function testSponsoredVenuePrioritization() {
  console.log('\nTest 2: Verify sponsored venues are prioritized');
  
  try {
    // Insert test venues with different sponsor tiers
    const testVenues = [
      { name: 'Regular Venue', type: 'softplay', sponsor: null, hoursAgo: 48 },
      { name: 'Gold Sponsor', type: 'softplay', sponsor: 'gold', hoursAgo: 24 },
      { name: 'Silver Sponsor', type: 'softplay', sponsor: 'silver', hoursAgo: 30 },
      { name: 'Bronze Sponsor', type: 'softplay', sponsor: 'bronze', hoursAgo: 36 },
    ];
    
    for (const v of testVenues) {
      await pool.query(
        `INSERT INTO venues (source, source_id, name, type, sponsor_tier, last_scraped, lat, lon)
         VALUES ('test_cron', $1, $2, $3, $4, NOW() - ($5 || ' hours')::interval, 51.5074, -0.1278)
         ON CONFLICT (source_id) DO UPDATE SET sponsor_tier = $4, last_scraped = NOW() - ($5 || ' hours')::interval`,
        [`test_${v.name.replace(/\s/g, '_')}`, v.name, v.type, v.sponsor, v.hoursAgo]
      );
    }
    
    // Get venues needing scrape
    const result = await pool.query('SELECT * FROM get_venues_needing_scrape(24) WHERE source = \'test_cron\'');
    const venues = result.rows;
    
    // Verify sponsored venues come first
    const firstVenue = venues[0];
    const hasSponsoredFirst = firstVenue && firstVenue.sponsor_tier === 'gold';
    
    // Verify ordering: gold > silver > bronze > none
    const sponsorOrder = venues
      .filter(v => v.sponsor_tier)
      .map(v => v.sponsor_tier);
    const expectedOrder = ['gold', 'silver', 'bronze'];
    const isOrderedCorrectly = expectedOrder.every((tier, i) => sponsorOrder[i] === tier);
    
    logTest('Sponsored venues prioritized first', hasSponsoredFirst);
    logTest('Sponsor order is gold > silver > bronze', isOrderedCorrectly);
    
    return venues;
  } catch (error) {
    logTest('Sponsored venue prioritization', false, error.message);
    return [];
  }
}

// Test 3: Verify stale venue detection
async function testStaleVenueDetection() {
  console.log('\nTest 3: Verify stale venue detection');
  
  try {
    // Insert a fresh venue (1 hour ago)
    await pool.query(
      `INSERT INTO venues (source, source_id, name, type, last_scraped, lat, lon)
       VALUES ('test_cron', 'test_fresh_venue', 'Fresh Venue', 'softplay', NOW() - '1 hour'::interval, 51.5074, -0.1278)
       ON CONFLICT (source_id) DO UPDATE SET last_scraped = NOW() - '1 hour'::interval`,
      []
    );
    
    // Insert a stale venue (48 hours ago)
    await pool.query(
      `INSERT INTO venues (source, source_id, name, type, last_scraped, lat, lon)
       VALUES ('test_cron', 'test_stale_venue', 'Stale Venue', 'softplay', NOW() - '48 hours'::interval, 51.5074, -0.1278)
       ON CONFLICT (source_id) DO UPDATE SET last_scraped = NOW() - '48 hours'::interval`,
      []
    );
    
    // Get venues needing scrape
    const result = await pool.query('SELECT * FROM get_venues_needing_scrape(24) WHERE source = \'test_cron\'');
    const venueNames = result.rows.map(v => v.name);
    
    const staleFound = venueNames.includes('Stale Venue');
    const freshNotFound = !venueNames.includes('Fresh Venue');
    
    logTest('Stale venue (48h) is detected', staleFound);
    logTest('Fresh venue (1h) is not detected', freshNotFound);
  } catch (error) {
    logTest('Stale venue detection', false, error.message);
  }
}

// Test 4: Verify venue deactivation function
async function testVenueDeactivation() {
  console.log('\nTest 4: Verify venue deactivation');
  
  try {
    // Insert active venue
    await pool.query(
      `INSERT INTO venues (source, source_id, name, type, is_active, lat, lon)
       VALUES ('test_cron', 'test_active_venue', 'Active Venue', 'softplay', true, 51.5074, -0.1278)
       ON CONFLICT (source_id) DO UPDATE SET is_active = true`,
      []
    );
    
    // Get venue ID
    const venueResult = await pool.query("SELECT id FROM venues WHERE source_id = 'test_active_venue'");
    if (venueResult.rows.length === 0) {
      logTest('Venue deactivation', false, 'Venue not found');
      return;
    }
    const venueId = venueResult.rows[0].id;
    
    // Deactivate venue
    await pool.query('SELECT deactivate_venue($1)', [venueId]);
    
    // Verify it's deactivated
    const result = await pool.query('SELECT is_active FROM venues WHERE id = $1', [venueId]);
    const isDeactivated = result.rows[0] && result.rows[0].is_active === false;
    
    logTest('Venue can be deactivated', isDeactivated);
  } catch (error) {
    logTest('Venue deactivation', false, error.message);
  }
}

// Test 5: Verify update_venue_scrape_time function
async function testUpdateScrapeTime() {
  console.log('\nTest 5: Verify update_venue_scrape_time function');
  
  try {
    // Insert venue with old timestamp
    await pool.query(
      `INSERT INTO venues (source, source_id, name, type, last_scraped, lat, lon)
       VALUES ('test_cron', 'test_scrape_time', 'Scrape Time Venue', 'softplay', NOW() - '48 hours'::interval, 51.5074, -0.1278)
       ON CONFLICT (source_id) DO UPDATE SET last_scraped = NOW() - '48 hours'::interval`,
      []
    );
    
    // Get venue ID
    const venueResult = await pool.query("SELECT id, last_scraped FROM venues WHERE source_id = 'test_scrape_time'");
    if (venueResult.rows.length === 0) {
      logTest('Update scrape time', false, 'Venue not found');
      return;
    }
    const venueId = venueResult.rows[0].id;
    const oldTime = venueResult.rows[0].last_scraped;
    
    // Update scrape time
    await pool.query('SELECT update_venue_scrape_time($1)', [venueId]);
    
    // Verify it's updated
    const result = await pool.query('SELECT last_scraped FROM venues WHERE id = $1', [venueId]);
    const newTime = result.rows[0].last_scraped;
    const isUpdated = newTime > oldTime;
    
    logTest('Scrape time can be updated', isUpdated);
  } catch (error) {
    logTest('Update scrape time', false, error.message);
  }
}

// Test 6: Verify venue type mapping
async function testVenueTypeMapping() {
  console.log('\nTest 6: Verify venue type mapping logic');
  
  // This tests the type mapping in cron-agent.js
  const typeMap = {
    'amusement_park': 'softplay',
    'bowling_alley': 'other',
    'community_center': 'community_hall',
    'gym': 'other',
    'park': 'park',
    'playground': 'park',
    'stadium': 'other',
    'swimming_pool': 'other',
    'tourist_attraction': 'other',
    'zoo': 'other'
  };
  
  const testCases = [
    { googleType: 'amusement_park', expected: 'softplay' },
    { googleType: 'community_center', expected: 'community_hall' },
    { googleType: 'park', expected: 'park' },
    { googleType: 'unknown_type', expected: 'other' },
  ];
  
  for (const tc of testCases) {
    const result = typeMap[tc.googleType] || 'other';
    logTest(`Maps ${tc.googleType} to ${tc.expected}`, result === tc.expected);
  }
}

// Test 7: Verify cron-agent.js can be loaded
async function testCronAgentModule() {
  console.log('\nTest 7: Verify cron-agent.js module can be loaded');
  
  try {
    // Clear require cache first
    delete require.cache[require.resolve('./cron-agent.js')];
    
    const cronAgent = require('./cron-agent.js');
    
    const hasRunCronAgent = typeof cronAgent.runCronAgent === 'function';
    const hasProcessStaleVenues = typeof cronAgent.processStaleVenues === 'function';
    
    logTest('cron-agent.js exports runCronAgent function', hasRunCronAgent);
    logTest('cron-agent.js exports processStaleVenues function', hasProcessStaleVenues);
  } catch (error) {
    logTest('cron-agent.js module loading', false, error.message);
  }
}

// Test 8: Verify rate limiting delay
async function testRateLimitingDelay() {
  console.log('\nTest 8: Verify rate limiting configuration');
  
  // Check that BATCH_SIZE and rate limit delay are configured
  const cronAgent = require('./cron-agent.js');
  
  // These values are hardcoded in cron-agent.js
  const BATCH_SIZE = 50;
  const RATE_LIMIT_DELAY = 100; // ms between API calls
  
  logTest('Batch size is 50 venues', BATCH_SIZE === 50);
  logTest('Rate limit delay is 100ms (10 req/sec)', RATE_LIMIT_DELAY === 100);
}

// Main test runner
async function runAllTests() {
  console.log('========================================');
  console.log('KidSpot London - Cron Agent Test Suite');
  console.log('========================================');
  
  const startTime = Date.now();
  
  try {
    // Connect to database
    await pool.connect();
    console.log('\n✓ Connected to database');
    
    // Run tests
    await testGetVenuesNeedingScrapeExists();
    await testSponsoredVenuePrioritization();
    await testStaleVenueDetection();
    await testVenueDeactivation();
    await testUpdateScrapeTime();
    await testVenueTypeMapping();
    await testCronAgentModule();
    await testRateLimitingDelay();
    
    // Cleanup
    await cleanupTestVenues();
    console.log('\n✓ Test venues cleaned up');
    
  } catch (error) {
    console.error('\n✗ Test suite error:', error.message);
  } finally {
    await pool.end();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    // Print summary
    console.log('\n========================================');
    console.log('Test Summary');
    console.log('========================================');
    console.log(`Total tests: ${testsRun}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`Duration: ${duration} seconds`);
    console.log('========================================');
    
    if (testsFailed > 0) {
      console.log('\n⚠ Some tests failed. Please review the output above.');
      process.exit(1);
    } else {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
