#!/usr/bin/env node
/**
 * Test script for venue deactivation functionality
 * Tests:
 * 1. Deactivation marks venue as inactive
 * 2. Deactivation is logged for auditability
 * 3. Inactive venues are excluded from search results
 * 4. Venue can be reactivated
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  testsRun++;
  try {
    await testFn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`);
    testsFailed++;
    return false;
  }
}

async function setup() {
  console.log('\n=== Setting up test data ===\n');

  // Clean up any existing test venues
  await pool.query(`
    DELETE FROM deactivation_log
    WHERE venue_id IN (
      SELECT id FROM venues WHERE name LIKE 'TEST_DEACT_%'
    )
  `);
  await pool.query(`
    DELETE FROM venues WHERE name LIKE 'TEST_DEACT_%'
  `);

  // Insert test venue
  const result = await pool.query(`
    INSERT INTO venues (name, lat, lon, type, source, source_id, is_active)
    VALUES ('TEST_DEACT_Test Venue', 51.5074, -0.1278, 'softplay', 'google', 'test_deact_123', TRUE)
    RETURNING id
  `);
  const venueId = result.rows[0].id;
  console.log(`Created test venue with ID: ${venueId}`);
  return venueId;
}

async function cleanup(venueId) {
  console.log('\n=== Cleaning up test data ===\n');
  await pool.query('DELETE FROM deactivation_log WHERE venue_id = $1', [venueId]);
  await pool.query('DELETE FROM venues WHERE id = $1', [venueId]);
}

async function testDeactivation(venueId) {
  console.log('\n=== Test 1: Deactivation marks venue as inactive ===\n');

  await runTest('Venue is active before deactivation', async () => {
    const result = await pool.query('SELECT is_active FROM venues WHERE id = $1', [venueId]);
    if (!result.rows[0] || result.rows[0].is_active !== true) {
      throw new Error('Venue should be active initially');
    }
  });

  await runTest('Deactivate venue', async () => {
    await pool.query('SELECT deactivate_venue($1, $2, $3)', [
      venueId,
      'test_deactivation',
      'Test deactivation for automated testing'
    ]);
  });

  await runTest('Venue is inactive after deactivation', async () => {
    const result = await pool.query('SELECT is_active FROM venues WHERE id = $1', [venueId]);
    if (!result.rows[0] || result.rows[0].is_active !== false) {
      throw new Error('Venue should be inactive after deactivation');
    }
  });
}

async function testAuditLog(venueId) {
  console.log('\n=== Test 2: Deactivation is logged for auditability ===\n');

  await runTest('Deactivation log entry exists', async () => {
    const result = await pool.query(
      'SELECT * FROM deactivation_log WHERE venue_id = $1',
      [venueId]
    );
    if (result.rows.length === 0) {
      throw new Error('Deactivation should be logged');
    }
  });

  await runTest('Log entry has correct reason', async () => {
    const result = await pool.query(
      'SELECT reason FROM deactivation_log WHERE venue_id = $1 ORDER BY id DESC LIMIT 1',
      [venueId]
    );
    if (result.rows[0].reason !== 'test_deactivation') {
      throw new Error(`Expected reason 'test_deactivation', got '${result.rows[0].reason}'`);
    }
  });

  await runTest('Log entry has notes', async () => {
    const result = await pool.query(
      'SELECT notes FROM deactivation_log WHERE venue_id = $1 ORDER BY id DESC LIMIT 1',
      [venueId]
    );
    if (!result.rows[0].notes) {
      throw new Error('Log entry should have notes');
    }
  });

  await runTest('Log entry has timestamp', async () => {
    const result = await pool.query(
      'SELECT deactivated_at FROM deactivation_log WHERE venue_id = $1 ORDER BY id DESC LIMIT 1',
      [venueId]
    );
    if (!result.rows[0].deactivated_at) {
      throw new Error('Log entry should have deactivated_at timestamp');
    }
  });
}

async function testExclusionFromSearch(venueId) {
  console.log('\n=== Test 3: Inactive venues are excluded from search results ===\n');

  // Get the venue's coordinates
  const venueResult = await pool.query('SELECT lat, lon FROM venues WHERE id = $1', [venueId]);
  const { lat, lon } = venueResult.rows[0];

  await runTest('Venue is excluded from search results', async () => {
    const result = await pool.query(`
      SELECT * FROM search_venues_by_radius($1, $2, 10000, NULL, 100)
    `, [lat, lon]);

    const found = result.rows.find(r => r.id === venueId);
    if (found) {
      throw new Error('Inactive venue should not appear in search results');
    }
  });
}

async function testReactivation(venueId) {
  console.log('\n=== Test 4: Venue can be reactivated ===\n');

  await runTest('Venue is inactive before reactivation', async () => {
    const result = await pool.query('SELECT is_active FROM venues WHERE id = $1', [venueId]);
    if (result.rows[0].is_active !== false) {
      throw new Error('Venue should be inactive before reactivation');
    }
  });

  await runTest('Reactivate venue', async () => {
    await pool.query('SELECT reactivate_venue($1, $2, $3)', [
      venueId,
      'test_reactivation',
      'Test reactivation for automated testing'
    ]);
  });

  await runTest('Venue is active after reactivation', async () => {
    const result = await pool.query('SELECT is_active FROM venues WHERE id = $1', [venueId]);
    if (result.rows[0].is_active !== true) {
      throw new Error('Venue should be active after reactivation');
    }
  });

  await runTest('Venue appears in search results after reactivation', async () => {
    const venueResult = await pool.query('SELECT lat, lon FROM venues WHERE id = $1', [venueId]);
    const { lat, lon } = venueResult.rows[0];

    const result = await pool.query(`
      SELECT * FROM search_venues_by_radius($1, $2, 10000, NULL, 100)
    `, [lat, lon]);

    const found = result.rows.find(r => r.id === venueId);
    if (!found) {
      throw new Error('Reactivated venue should appear in search results');
    }
  });

  await runTest('Reactivation is logged', async () => {
    const result = await pool.query(
      'SELECT reason FROM deactivation_log WHERE venue_id = $1 ORDER BY id DESC LIMIT 1',
      [venueId]
    );
    if (result.rows[0].reason !== 'reactivated') {
      throw new Error('Reactivation should be logged');
    }
  });
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     KidSpot London - Venue Deactivation Test Suite         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let venueId;

  try {
    await pool.connect();
    console.log('\n✓ Connected to database\n');

    venueId = await setup();

    await testDeactivation(venueId);
    await testAuditLog(venueId);
    await testExclusionFromSearch(venueId);
    await testReactivation(venueId);

  } catch (error) {
    console.error('\nFatal error:', error);
    testsFailed++;
  } finally {
    if (venueId) {
      await cleanup(venueId);
    }
    await pool.end();
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST RESULTS                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total:  ${testsRun}`);
  console.log(`  Passed: ${testsPassed}`);
  console.log(`  Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('  ✓ All tests passed!\n');
  } else {
    console.log('  ✗ Some tests failed.\n');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

runAllTests();