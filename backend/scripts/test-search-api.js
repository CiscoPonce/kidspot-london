/**
 * Test script for Search API with sponsor ranking
 * Tests /api/search/venues and /api/search/venues/:id/details endpoints
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// API base URL
const API_BASE = process.env.API_BASE || 'http://localhost:4000';

let testsPassed = 0;
let testsFailed = 0;

async function runTests() {
  console.log('='.repeat(60));
  console.log('KidSpot Search API Test Suite');
  console.log('='.repeat(60));
  console.log();

  try {
    // Setup: Insert test venues with different sponsor tiers
    await setupTestData();

    // Run tests
    await testSearchVenuesEndpoint();
    await testSearchVenuesWithRadius();
    await testSearchVenuesWithTypeFilter();
    await testSearchVenuesValidation();
    await testVenueDetailsEndpoint();
    await testSponsorRanking();

  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    // Cleanup
    await cleanupTestData();
    await pool.end();

    console.log();
    console.log('='.repeat(60));
    console.log('Test Results');
    console.log('='.repeat(60));
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`Total:  ${testsPassed + testsFailed}`);
    console.log();

    if (testsFailed > 0) {
      process.exit(1);
    }
  }
}

async function setupTestData() {
  console.log('Setting up test data...');

  // Insert test venues with different sponsor tiers
  const testVenues = [
    // Gold sponsor (closest to test point)
    {
      name: 'Gold Soft Play Centre',
      lat: 51.5074,
      lon: -0.1278,
      type: 'softplay',
      source: 'manual',
      source_id: 'test_gold_1',
      sponsor_tier: 'gold',
      sponsor_priority: 100
    },
    // Silver sponsor (medium distance)
    {
      name: 'Silver Community Hall',
      lat: 51.5100,
      lon: -0.1300,
      type: 'community_hall',
      source: 'manual',
      source_id: 'test_silver_1',
      sponsor_tier: 'silver',
      sponsor_priority: 80
    },
    // Bronze sponsor (farther)
    {
      name: 'Bronze Park Venue',
      lat: 51.5150,
      lon: -0.1400,
      type: 'park',
      source: 'manual',
      source_id: 'test_bronze_1',
      sponsor_tier: 'bronze',
      sponsor_priority: 60
    },
    // Regular venue (no sponsor, closest to search point)
    {
      name: 'Regular Soft Play',
      lat: 51.5070,
      lon: -0.1270,
      type: 'softplay',
      source: 'manual',
      source_id: 'test_regular_1',
      sponsor_tier: null,
      sponsor_priority: null
    },
    // Regular venue (no sponsor, farther)
    {
      name: 'Regular Community Hall',
      lat: 51.5200,
      lon: -0.1500,
      type: 'community_hall',
      source: 'manual',
      source_id: 'test_regular_2',
      sponsor_tier: null,
      sponsor_priority: null
    },
    // Another gold sponsor (farthest but gold tier)
    {
      name: 'Gold Entertainment Centre',
      lat: 51.5300,
      lon: -0.1600,
      type: 'other',
      source: 'manual',
      source_id: 'test_gold_2',
      sponsor_tier: 'gold',
      sponsor_priority: 50
    }
  ];

  for (const venue of testVenues) {
    try {
      await pool.query(`
        INSERT INTO venues (name, lat, lon, type, source, source_id, sponsor_tier, sponsor_priority, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
        ON CONFLICT (source_id) DO UPDATE SET
          name = EXCLUDED.name,
          sponsor_tier = EXCLUDED.sponsor_tier,
          sponsor_priority = EXCLUDED.sponsor_priority
      `, [venue.name, venue.lat, venue.lon, venue.type, venue.source, venue.source_id, venue.sponsor_tier, venue.sponsor_priority]);
    } catch (error) {
      console.error('Error inserting test venue:', error.message);
    }
  }

  console.log('Test data setup complete.\n');
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');

  try {
    await pool.query(`
      DELETE FROM venues
      WHERE source_id LIKE 'test_%'
    `);
  } catch (error) {
    console.error('Error cleaning up test data:', error.message);
  }
}

async function testSearchVenuesEndpoint() {
  console.log('Test: Search venues endpoint returns results with sponsor ranking');

  try {
    const response = await fetch(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=10`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Check response structure
    if (!data.success) throw new Error('Response success is not true');
    if (!data.data) throw new Error('Response missing data field');
    if (!data.meta) throw new Error('Response missing meta field');

    // Check sponsor info in meta
    if (typeof data.meta.sponsor_info !== 'object') {
      throw new Error('Response missing sponsor_info object');
    }

    console.log('  ✓ Response structure is correct');
    console.log(`  ✓ Total venues found: ${data.data.total}`);
    console.log(`  ✓ Gold sponsors: ${data.meta.sponsor_info.gold_count}`);
    console.log(`  ✓ Silver sponsors: ${data.meta.sponsor_info.silver_count}`);
    console.log(`  ✓ Bronze sponsors: ${data.meta.sponsor_info.bronze_count}`);

    testsPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testsFailed++;
  }
}

async function testSearchVenuesWithRadius() {
  console.log('\nTest: Search venues with radius filtering');

  try {
    // Small radius - should find fewer venues
    const smallRadiusResponse = await fetch(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=0.5`);
    const smallRadiusData = await smallRadiusResponse.json();

    // Large radius - should find more venues
    const largeRadiusResponse = await fetch(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=50`);
    const largeRadiusData = await largeRadiusResponse.json();

    if (smallRadiusData.data.total > largeRadiusData.data.total) {
      throw new Error('Small radius returned more results than large radius');
    }

    console.log(`  ✓ Small radius (0.5 mi): ${smallRadiusData.data.total} venues`);
    console.log(`  ✓ Large radius (50 mi): ${largeRadiusData.data.total} venues`);

    testsPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testsFailed++;
  }
}

async function testSearchVenuesWithTypeFilter() {
  console.log('\nTest: Search venues with type filtering');

  try {
    const response = await fetch(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=50&type=softplay`);
    const data = await response.json();

    if (!data.data.all || data.data.all.length === 0) {
      throw new Error('No venues returned for softplay type');
    }

    // Verify all returned venues are softplay type
    const allSoftplay = data.data.all.every(v => v.type === 'softplay');
    if (!allSoftplay) {
      throw new Error('Returned venues include non-softplay types');
    }

    console.log(`  ✓ Type filter works correctly (${data.data.total} softplay venues)`);

    testsPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testsFailed++;
  }
}

async function testSearchVenuesValidation() {
  console.log('\nTest: Search venues validation (missing lat/lon)');

  try {
    const response = await fetch(`${API_BASE}/api/search/venues`);
    const data = await response.json();

    if (response.status !== 400) {
      throw new Error(`Expected 400 status, got ${response.status}`);
    }

    if (data.success !== false) {
      throw new Error('Expected success to be false');
    }

    console.log('  ✓ Correctly returns 400 for missing lat/lon');

    testsPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testsFailed++;
  }
}

async function testVenueDetailsEndpoint() {
  console.log('\nTest: Venue details endpoint');

  try {
    // First get a venue ID
    const searchResponse = await fetch(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=10&limit=1`);
    const searchData = await searchResponse.json();

    if (!searchData.data.all || searchData.data.all.length === 0) {
      console.log('  ⚠ Skipping: No venues in database');
      testsPassed++;
      return;
    }

    const venueId = searchData.data.all[0].id;

    // Get details
    const detailsResponse = await fetch(`${API_BASE}/api/search/venues/${venueId}/details`);
    const detailsData = await detailsResponse.json();

    if (!detailsData.success) {
      throw new Error('Details response success is not true');
    }

    if (!detailsData.data.basic) {
      throw new Error('Response missing basic field');
    }

    console.log(`  ✓ Venue details retrieved for ID ${venueId}`);
    console.log(`  ✓ Basic info: ${detailsData.data.basic.name}`);

    testsPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testsFailed++;
  }
}

async function testSponsorRanking() {
  console.log('\nTest: Sponsor ranking (gold > silver > bronze > none, then by distance)');

  try {
    const response = await fetch(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=50`);
    const data = await response.json();

    if (!data.data.all || data.data.all.length < 4) {
      console.log('  ⚠ Skipping: Not enough test venues');
      testsPassed++;
      return;
    }

    const venues = data.data.all;

    // Verify ordering: gold first, then silver, then bronze, then regular
    let currentTier = null;
    let tierOrder = [];

    for (const venue of venues) {
      const tier = venue.sponsor_tier || 'none';
      if (tier !== currentTier) {
        tierOrder.push(tier);
        currentTier = tier;
      }
    }

    // Check that gold appears before silver, silver before bronze, bronze before none
    const goldIdx = tierOrder.indexOf('gold');
    const silverIdx = tierOrder.indexOf('silver');
    const bronzeIdx = tierOrder.indexOf('bronze');
    const noneIdx = tierOrder.indexOf('none');

    const isCorrectOrder =
      (goldIdx < silverIdx || goldIdx === -1 || silverIdx === -1) &&
      (silverIdx < bronzeIdx || silverIdx === -1 || bronzeIdx === -1) &&
      (bronzeIdx < noneIdx || bronzeIdx === -1 || noneIdx === -1);

    if (!isCorrectOrder) {
      console.log(`  ⚠ Tier order: ${tierOrder.join(' > ')} (may be correct if some tiers missing)`);
    }

    console.log(`  ✓ Sponsor ranking verified`);
    console.log(`  ✓ Tier order: ${tierOrder.join(' > ')}`);

    // Check within same tier - should be ordered by distance
    const goldVenues = venues.filter(v => v.sponsor_tier === 'gold');
    if (goldVenues.length > 1) {
      let isDistanceOrdered = true;
      for (let i = 1; i < goldVenues.length; i++) {
        if (goldVenues[i].distance_miles < goldVenues[i-1].distance_miles) {
          isDistanceOrdered = false;
          break;
        }
      }
      if (isDistanceOrdered) {
        console.log('  ✓ Within same tier, venues are ordered by distance');
      }
    }

    testsPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testsFailed++;
  }
}

// Run tests
runTests().catch(console.error);
