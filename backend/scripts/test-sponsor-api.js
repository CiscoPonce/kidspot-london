/**
 * Test Sponsor API Script
 * Tests all sponsor management endpoints with and without admin authentication
 */

const http = require('http');

const API_BASE = process.env.API_URL || 'http://localhost:4000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'test-admin-key-12345';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test(name, fn) {
  testsRun++;
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name} - ${error.message}`);
    testsFailed++;
  }
}

async function expectStatus(name, response, expectedStatus) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}

async function expectTrue(name, value) {
  if (!value) {
    throw new Error(`Expected truthy value, got ${value}`);
  }
}

async function expectEqual(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

// Test data
const testVenues = [
  { name: 'Test Bronze Venue', type: 'softplay', lat: 51.5074, lon: -0.1278, sponsor_tier: 'bronze', sponsor_priority: 100 },
  { name: 'Test Silver Venue', type: 'softplay', lat: 51.5075, lon: -0.1279, sponsor_tier: 'silver', sponsor_priority: 200 },
  { name: 'Test Gold Venue', type: 'softplay', lat: 51.5076, lon: -0.1280, sponsor_tier: 'gold', sponsor_priority: 300 }
];

async function insertTestVenues() {
  console.log('\n📝 Inserting test venues...');
  const inserted = [];
  for (const venue of testVenues) {
    const res = await makeRequest('/api/search/venues', 'POST', {
      action: 'insert_test',
      ...venue
    });
    if (res.status === 200 || res.status === 201) {
      inserted.push(venue);
    }
  }
  return inserted;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('SPONSOR API TEST SUITE');
  console.log('='.repeat(60));

  // Insert test data
  await insertTestVenues();

  // Test 1: Get sponsor statistics
  await test('GET /api/sponsors/stats - returns sponsor statistics', async () => {
    const res = await makeRequest('/api/sponsors/stats');
    await expectStatus('status', res, 200);
    if (!res.data.success) throw new Error('Response not successful');
    if (!Array.isArray(res.data.data)) throw new Error('Data should be an array');
    if (res.data.data.length === 0) throw new Error('Should have sponsor data');
    
    // Check structure of each tier
    const validTiers = ['gold', 'silver', 'bronze', 'none'];
    for (const row of res.data.data) {
      if (!validTiers.includes(row.tier)) throw new Error(`Invalid tier: ${row.tier}`);
      if (typeof row.count !== 'number') throw new Error('Count should be a number');
      if (typeof row.percentage !== 'number') throw new Error('Percentage should be a number');
    }
    console.log(`   Found tiers: ${res.data.data.map(r => `${r.tier}(${r.count})`).join(', ')}`);
  });

  // Test 2: Get sponsored venues
  await test('GET /api/sponsors/venues - returns all sponsored venues', async () => {
    const res = await makeRequest('/api/sponsors/venues');
    await expectStatus('status', res, 200);
    if (!res.data.success) throw new Error('Response not successful');
    if (!Array.isArray(res.data.data)) throw new Error('Data should be an array');
    console.log(`   Found ${res.data.data.length} sponsored venues`);
  });

  // Test 3: Get sponsored venues filtered by tier
  await test('GET /api/sponsors/venues?tier=gold - returns gold tier venues', async () => {
    const res = await makeRequest('/api/sponsors/venues?tier=gold');
    await expectStatus('status', res, 200);
    if (!res.data.success) throw new Error('Response not successful');
    for (const venue of res.data.data) {
      if (venue.sponsor_tier !== 'gold') throw new Error('All venues should be gold tier');
    }
    console.log(`   Found ${res.data.data.length} gold tier venues`);
  });

  // Test 4: Get venue sponsor details (assuming we know a venue ID)
  await test('GET /api/sponsors/venues/:id - returns venue sponsor details', async () => {
    // First get all sponsored venues
    const venuesRes = await makeRequest('/api/sponsors/venues');
    if (venuesRes.data.data.length > 0) {
      const venueId = venuesRes.data.data[0].id;
      const res = await makeRequest(`/api/sponsors/venues/${venueId}`);
      await expectStatus('status', res, 200);
      if (!res.data.success) throw new Error('Response not successful');
      if (!res.data.data.id) throw new Error('Should have venue data');
      console.log(`   Venue: ${res.data.data.name} (${res.data.data.sponsor_tier})`);
    }
  });

  // Test 5: Get venue sponsor details - 404 for non-existent venue
  await test('GET /api/sponsors/venues/99999999 - returns 404 for non-existent venue', async () => {
    const res = await makeRequest('/api/sponsors/venues/99999999');
    await expectStatus('status', res, 404);
  });

  // Test 6: Get sponsor pricing
  await test('GET /api/sponsors/pricing - returns sponsor pricing', async () => {
    const res = await makeRequest('/api/sponsors/pricing');
    await expectStatus('status', res, 200);
    if (!res.data.success) throw new Error('Response not successful');
    
    const tiers = res.data.data.tiers;
    if (!tiers.bronze) throw new Error('Should have bronze tier');
    if (!tiers.silver) throw new Error('Should have silver tier');
    if (!tiers.gold) throw new Error('Should have gold tier');
    
    // Check pricing structure
    if (tiers.bronze.pricing.monthly !== 99) throw new Error('Bronze monthly price incorrect');
    if (tiers.silver.pricing.monthly !== 199) throw new Error('Silver monthly price incorrect');
    if (tiers.gold.pricing.monthly !== 499) throw new Error('Gold monthly price incorrect');
    
    console.log(`   Bronze: £${tiers.bronze.pricing.monthly}/month`);
    console.log(`   Silver: £${tiers.silver.pricing.monthly}/month`);
    console.log(`   Gold: £${tiers.gold.pricing.monthly}/month`);
  });

  // Test 7: Admin endpoint WITHOUT admin key - should fail
  await test('PUT /api/sponsors/venues/:id/tier without admin key - should be protected', async () => {
    const venuesRes = await makeRequest('/api/sponsors/venues');
    if (venuesRes.data.data.length > 0) {
      const venueId = venuesRes.data.data[0].id;
      const res = await makeRequest(`/api/sponsors/venues/${venueId}/tier`, 'PUT', {
        tier: 'gold',
        priority: 100
      });
      // Should be rejected with 403
      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      }
      console.log(`   Correctly rejected without admin key`);
    }
  });

  // Test 8: Admin endpoint WITH admin key - should succeed
  await test('PUT /api/sponsors/venues/:id/tier with admin key - should update tier', async () => {
    const venuesRes = await makeRequest('/api/sponsors/venues');
    if (venuesRes.data.data.length > 0) {
      const venueId = venuesRes.data.data[0].id;
      const res = await makeRequest(`/api/sponsors/venues/${venueId}/tier`, 'PUT', {
        tier: 'gold',
        priority: 100
      }, { 'X-Admin-Key': ADMIN_KEY });
      
      if (res.status === 403) {
        throw new Error('Admin key was rejected - may need to set ADMIN_KEY env var');
      }
      await expectStatus('status', res, 200);
      if (!res.data.success) throw new Error('Response not successful');
      console.log(`   Successfully updated venue ${venueId} to gold tier`);
    }
  });

  // Test 9: Tier validation
  await test('PUT /api/sponsors/venues/:id/tier with invalid tier - should reject', async () => {
    const venuesRes = await makeRequest('/api/sponsors/venues');
    if (venuesRes.data.data.length > 0) {
      const venueId = venuesRes.data.data[0].id;
      const res = await makeRequest(`/api/sponsors/venues/${venueId}/tier`, 'PUT', {
        tier: 'invalid_tier',
        priority: 100
      }, { 'X-Admin-Key': ADMIN_KEY });
      
      await expectStatus('status', res, 400);
      console.log(`   Correctly rejected invalid tier`);
    }
  });

  // Test 10: Priority validation
  await test('PUT /api/sponsors/venues/:id/tier with negative priority - should reject', async () => {
    const venuesRes = await makeRequest('/api/sponsors/venues');
    if (venuesRes.data.data.length > 0) {
      const venueId = venuesRes.data.data[0].id;
      const res = await makeRequest(`/api/sponsors/venues/${venueId}/tier`, 'PUT', {
        tier: 'silver',
        priority: -1
      }, { 'X-Admin-Key': ADMIN_KEY });
      
      await expectStatus('status', res, 400);
      console.log(`   Correctly rejected negative priority`);
    }
  });

  // Test 11: Bulk tier update without admin key - should fail
  await test('POST /api/sponsors/venues/bulk/tier without admin key - should be protected', async () => {
    const res = await makeRequest('/api/sponsors/venues/bulk/tier', 'POST', {
      venues: [{ id: 1, tier: 'gold', priority: 100 }]
    });
    
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    }
    console.log(`   Correctly rejected bulk update without admin key`);
  });

  // Test 12: Bulk tier update with admin key
  await test('POST /api/sponsors/venues/bulk/tier with admin key - should bulk update', async () => {
    const res = await makeRequest('/api/sponsors/venues/bulk/tier', 'POST', {
      venues: [
        { id: 1, tier: 'gold', priority: 100 },
        { id: 2, tier: 'silver', priority: 50 }
      ]
    }, { 'X-Admin-Key': ADMIN_KEY });
    
    if (res.status === 403) {
      throw new Error('Admin key was rejected');
    }
    await expectStatus('status', res, 200);
    if (!res.data.success) throw new Error('Response not successful');
    
    const data = res.data.data;
    if (typeof data.updated !== 'number') throw new Error('Should have updated count');
    if (typeof data.errors !== 'number') throw new Error('Should have errors count');
    if (typeof data.total !== 'number') throw new Error('Should have total count');
    
    console.log(`   Bulk update result: ${data.updated} updated, ${data.errors} errors, ${data.total} total`);
  });

  // Test 13: Bulk tier update with empty array - should fail
  await test('POST /api/sponsors/venues/bulk/tier with empty array - should reject', async () => {
    const res = await makeRequest('/api/sponsors/venues/bulk/tier', 'POST', {
      venues: []
    }, { 'X-Admin-Key': ADMIN_KEY });
    
    await expectStatus('status', res, 400);
    console.log(`   Correctly rejected empty venues array`);
  });

  // Test 14: Bulk tier update with mixed valid/invalid tiers
  await test('POST /api/sponsors/venues/bulk/tier with mixed tiers - should handle gracefully', async () => {
    const res = await makeRequest('/api/sponsors/venues/bulk/tier', 'POST', {
      venues: [
        { id: 1, tier: 'gold', priority: 100 },
        { id: 2, tier: 'invalid_tier', priority: 50 },
        { id: 3, tier: 'silver', priority: 75 }
      ]
    }, { 'X-Admin-Key': ADMIN_KEY });
    
    await expectStatus('status', res, 200);
    console.log(`   Mixed tier update handled`);
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total:  ${testsRun}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('='.repeat(60));

  if (testsFailed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
