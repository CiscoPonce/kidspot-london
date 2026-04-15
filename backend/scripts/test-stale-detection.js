#!/usr/bin/env node
/**
 * Test script for stale venue detection
 * Validates that get_venues_needing_scrape works correctly
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Test configuration
const TEST_VENUES = [
  { name: 'Fresh Gold Venue', source: 'google', source_id: 'test_fresh_gold', type: 'softplay', lat: 51.5074, lon: -0.1278, sponsor_tier: 'gold', hours_ago: 1 },
  { name: 'Fresh Silver Venue', source: 'google', source_id: 'test_fresh_silver', type: 'community_hall', lat: 51.5075, lon: -0.1279, sponsor_tier: 'silver', hours_ago: 2 },
  { name: 'Fresh Bronze Venue', source: 'osm', source_id: 'test_fresh_bronze', type: 'park', lat: 51.5076, lon: -0.1280, sponsor_tier: 'bronze', hours_ago: 3 },
  { name: 'Fresh Regular Venue', source: 'google', source_id: 'test_fresh_regular', type: 'softplay', lat: 51.5077, lon: -0.1281, sponsor_tier: null, hours_ago: 4 },
  { name: 'Stale Gold Venue', source: 'google', source_id: 'test_stale_gold', type: 'softplay', lat: 51.5078, lon: -0.1282, sponsor_tier: 'gold', hours_ago: 30 },
  { name: 'Stale Silver Venue', source: 'yelp', source_id: 'test_stale_silver', type: 'community_hall', lat: 51.5079, lon: -0.1283, sponsor_tier: 'silver', hours_ago: 48 },
  { name: 'Stale Bronze Venue', source: 'osm', source_id: 'test_stale_bronze', type: 'park', lat: 51.5080, lon: -0.1284, sponsor_tier: 'bronze', hours_ago: 72 },
  { name: 'Stale Regular Venue', source: 'google', source_id: 'test_stale_regular', type: 'softplay', lat: 51.5081, lon: -0.1285, sponsor_tier: null, hours_ago: 100 },
  { name: 'Never Scraped Venue', source: 'manual', source_id: 'test_never_scraped', type: 'other', lat: 51.5082, lon: -0.1286, sponsor_tier: null, hours_ago: null }
];

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

async function setup() {
  console.log('=== Setting up test data ===\n');

  // Clean up any existing test venues
  const sourceIds = TEST_VENUES.map(v => v.source_id);
  await pool.query(
    `DELETE FROM venues WHERE source_id = ANY($1)`,
    [sourceIds]
  );

  // Insert test venues
  for (const venue of TEST_VENUES) {
    const lastScraped = venue.hours_ago === null
      ? null
      : new Date(Date.now() - venue.hours_ago * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO venues (name, source, source_id, type, lat, lon, sponsor_tier, last_scraped)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [venue.name, venue.source, venue.source_id, venue.type, venue.lat, venue.lon, venue.sponsor_tier, lastScraped]
    );
  }

  console.log(`Inserted ${TEST_VENUES.length} test venues\n`);
}

async function testStaleThreshold24Hours() {
  console.log('=== Test: 24-hour stale threshold ===');
  testsRun++;

  const result = await pool.query('SELECT * FROM get_venues_needing_scrape(24)');
  const venues = result.rows;

  // Should return: stale_gold, stale_silver, stale_bronze, stale_regular, never_scraped
  // Should NOT return: fresh venues
  const expectedCount = 5;
  const staleVenueNames = venues.map(v => v.name);

  console.log(`  Found ${venues.length} stale venues (expected ${expectedCount})`);

  // Verify we got the right venues
  const expectedVenues = ['Stale Gold Venue', 'Stale Silver Venue', 'Stale Bronze Venue', 'Stale Regular Venue', 'Never Scraped Venue'];
  const hasAllExpected = expectedVenues.every(name => staleVenueNames.includes(name));

  if (venues.length === expectedCount && hasAllExpected) {
    console.log('  ✓ PASSED: Correct stale venues returned\n');
    testsPassed++;
    return true;
  } else {
    console.log('  ✗ FAILED: Incorrect venues returned');
    console.log(`  Expected: ${expectedVenues.join(', ')}`);
    console.log(`  Got: ${staleVenueNames.join(', ')}\n`);
    testsFailed++;
    return false;
  }
}

async function testSponsorPriority() {
  console.log('=== Test: Sponsor priority ordering ===');
  testsRun++;

  const result = await pool.query('SELECT * FROM get_venues_needing_scrape(100)');
  const venues = result.rows;

  // Verify sponsor ordering: gold > silver > bronze > none > null
  const sponsorOrder = { 'gold': 1, 'silver': 2, 'bronze': 3 };
  let isOrdered = true;

  for (let i = 1; i < venues.length; i++) {
    const prevTier = venues[i-1].sponsor_tier;
    const currTier = venues[i].sponsor_tier;
    const prevOrder = sponsorOrder[prevTier] || 4;
    const currOrder = sponsorOrder[currTier] || 4;

    if (prevOrder > currOrder) {
      isOrdered = false;
      break;
    }
  }

  // Within same sponsor tier, older last_scraped should come first
  let lastScraped = null;
  let withinTierOrdered = true;
  for (const venue of venues) {
    if (lastScraped !== null && venue.last_scraped !== null) {
      const prevTime = new Date(lastScraped).getTime();
      const currTime = new Date(venue.last_scraped).getTime();
      if (prevTime > currTime) {
        withinTierOrdered = false;
        break;
      }
    }
    lastScraped = venue.last_scraped;
  }

  console.log(`  Sponsor tier ordering: ${isOrdered ? '✓' : '✗'}`);
  console.log(`  Within-tier last_scraped ordering: ${withinTierOrdered ? '✓' : '✗'}`);

  if (isOrdered && withinTierOrdered) {
    console.log('  ✓ PASSED: Sponsor priority is correct\n');
    testsPassed++;
    return true;
  } else {
    console.log('  ✗ FAILED: Sponsor priority ordering is incorrect\n');
    testsFailed++;
    return false;
  }
}

async function testLimit100() {
  console.log('=== Test: Limit 100 venues ===');
  testsRun++;

  // Create many venues to test limit
  const manyVenues = [];
  for (let i = 0; i < 150; i++) {
    manyVenues.push({
      name: `Bulk Venue ${i}`,
      source: 'test',
      source_id: `bulk_${i}`,
      type: 'other',
      lat: 51.5 + (i * 0.001),
      lon: -0.1 + (i * 0.001),
      sponsor_tier: null
    });
  }

  // Clean up and insert
  await pool.query(`DELETE FROM venues WHERE source_id LIKE 'bulk_%'`);
  for (const venue of manyVenues) {
    await pool.query(
      `INSERT INTO venues (name, source, source_id, type, lat, lon, sponsor_tier, last_scraped)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '48 hours')`,
      [venue.name, venue.source, venue.source_id, venue.type, venue.lat, venue.lon, venue.sponsor_tier]
    );
  }

  const result = await pool.query('SELECT COUNT(*) as count FROM get_venues_needing_scrape(24)');
  const count = parseInt(result.rows[0].count, 10);

  console.log(`  Venues returned: ${count} (max should be 100)`);

  // Clean up
  await pool.query(`DELETE FROM venues WHERE source_id LIKE 'bulk_%'`);

  if (count <= 100) {
    console.log('  ✓ PASSED: Limit is respected\n');
    testsPassed++;
    return true;
  } else {
    console.log('  ✗ FAILED: Limit exceeded\n');
    testsFailed++;
    return false;
  }
}

async function testIndexUsage() {
  console.log('=== Test: Index usage (explain) ===');
  testsRun++;

  const result = await pool.query(`
    EXPLAIN SELECT * FROM get_venues_needing_scrape(24)
  `);

  const explainOutput = result.rows.map(r => r['QUERY PLAN']).join(' ');
  const usesIndex = explainOutput.includes('idx_venues_last_scraped');

  console.log(`  Query plan: ${explainOutput.replace(/\s+/g, ' ').substring(0, 100)}...`);
  console.log(`  Uses last_scraped index: ${usesIndex ? '✓' : '✗'}`);

  if (usesIndex) {
    console.log('  ✓ PASSED: Index is being used\n');
    testsPassed++;
    return true;
  } else {
    console.log('  ✗ FAILED: Index not used (may still work but not optimal)\n');
    testsFailed++;
    return false;
  }
}

async function cleanup() {
  console.log('=== Cleaning up test data ===\n');

  const sourceIds = TEST_VENUES.map(v => v.source_id);
  await pool.query(
    `DELETE FROM venues WHERE source_id = ANY($1)`,
    [sourceIds]
  );

  console.log('Cleanup complete\n');
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  KidSpot London - Stale Venue Detection Test Suite       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    await setup();
    await testStaleThreshold24Hours();
    await testSponsorPriority();
    await testLimit100();
    await testIndexUsage();
    await cleanup();

    // Print summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`  Tests run:    ${testsRun}`);
    console.log(`  Tests passed: ${testsPassed}`);
    console.log(`  Tests failed: ${testsFailed}`);
    console.log('');

    if (testsFailed === 0) {
      console.log('  ✓ ALL TESTS PASSED\n');
    } else {
      console.log('  ✗ SOME TESTS FAILED\n');
    }

  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    await pool.end();
  }
}

// Run tests
runTests()
  .then(() => process.exit(testsFailed > 0 ? 1 : 0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
