import { operatorService } from '../src/services/operatorService.js';
import { venueService } from '../src/services/venueService.js';
import { db } from '../src/clients/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testOperatorIntegration() {
  console.log('Starting Operator Integration Test...');

  try {
    // 1. Check active partnerships
    const partnerships = await operatorService.getActivePartnerships();
    console.log(`✓ Found ${partnerships.length} active partnerships.`);
    if (partnerships.length === 0) throw new Error('No active partnerships found');

    // 2. Test name similarity
    const sim1 = operatorService.calculateNameSimilarity('Atherton Leisure Centre', 'Atherton Leisure Centre');
    const sim2 = operatorService.calculateNameSimilarity('Atherton Leisure Centre', 'Atherton LC');
    console.log(`✓ Name similarity (exact): ${sim1}`);
    console.log(`✓ Name similarity (partial): ${sim2}`);
    if (sim1 !== 1.0) throw new Error('Exact similarity should be 1.0');

    // 3. Test operator venue matching (mocking database)
    // We'll insert a test operator venue and try to match it
    const pId = partnerships[0].id;
    const testOpVenue = {
      operator_partnership_id: pId,
      external_id: 'test-123',
      name: 'Test Venue ' + Date.now(),
      postcode: 'E15 4LF',
      lat: 51.54,
      lon: 0.00,
      raw_data: { test: true }
    };

    await db.query(
      `INSERT INTO operator_venues (operator_partnership_id, external_id, name, postcode, lat, lon, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [pId, testOpVenue.external_id, testOpVenue.name, testOpVenue.postcode, testOpVenue.lat, testOpVenue.lon, testOpVenue.raw_data]
    );

    const result = await db.query(
      'SELECT id FROM operator_venues WHERE external_id = $1 AND operator_partnership_id = $2',
      [testOpVenue.external_id, pId]
    );
    const opVenueId = result.rows[0].id;

    const match = await venueService.matchOperatorVenueToVenue(opVenueId);
    console.log('✓ Match result:', match);

    console.log('\nOperator Integration Test Passed!');
  } catch (error) {
    console.error('\nOperator Integration Test Failed:');
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testOperatorIntegration();
