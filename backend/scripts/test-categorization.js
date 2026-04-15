#!/usr/bin/env node

/**
 * Test script for venue categorization across all data sources.
 * Validates that type mapping works correctly for Google Places, OSM, and CSV sources.
 */

// Test counters
let passed = 0;
let failed = 0;

// Import the mapping functions from their respective modules
const cronAgent = require('./cron-agent.js');
const osmDiscovery = require('./discovery/osm-discovery.js');
const londonImport = require('./import-london-datastore.js');

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected '${expected}', got '${actual}'`);
  }
}

// Google Places Type Mapping Tests
function testGooglePlacesMapping() {
  console.log('\n--- Google Places Type Mapping ---');
  
  test('amusement_park maps to softplay', () => {
    assertEqual(cronAgent.mapVenueType(['amusement_park']), 'softplay', 'Type mapping');
  });
  
  test('bowling_alley maps to other', () => {
    assertEqual(cronAgent.mapVenueType(['bowling_alley']), 'other', 'Type mapping');
  });
  
  test('community_center maps to community_hall', () => {
    assertEqual(cronAgent.mapVenueType(['community_center']), 'community_hall', 'Type mapping');
  });
  
  test('gym maps to other', () => {
    assertEqual(cronAgent.mapVenueType(['gym']), 'other', 'Type mapping');
  });
  
  test('park maps to park', () => {
    assertEqual(cronAgent.mapVenueType(['park']), 'park', 'Type mapping');
  });
  
  test('playground maps to park', () => {
    assertEqual(cronAgent.mapVenueType(['playground']), 'park', 'Type mapping');
  });
  
  test('stadium maps to other', () => {
    assertEqual(cronAgent.mapVenueType(['stadium']), 'other', 'Type mapping');
  });
  
  test('swimming_pool maps to other', () => {
    assertEqual(cronAgent.mapVenueType(['swimming_pool']), 'other', 'Type mapping');
  });
  
  test('tourist_attraction maps to other', () => {
    assertEqual(cronAgent.mapVenueType(['tourist_attraction']), 'other', 'Type mapping');
  });
  
  test('zoo maps to other', () => {
    assertEqual(cronAgent.mapVenueType(['zoo']), 'other', 'Type mapping');
  });
  
  test('unknown type returns other', () => {
    assertEqual(cronAgent.mapVenueType(['unknown_type']), 'other', 'Unknown type');
  });
  
  test('multiple types returns first match', () => {
    assertEqual(cronAgent.mapVenueType(['restaurant', 'gym', 'park']), 'other', 'First match');
    assertEqual(cronAgent.mapVenueType(['park', 'gym']), 'park', 'First match');
  });
  
  test('empty types array returns other', () => {
    assertEqual(cronAgent.mapVenueType([]), 'other', 'Empty array');
  });
}

// OSM Tag Mapping Tests
function testOSMTagMapping() {
  console.log('\n--- OSM Tag Mapping ---');
  
  test('leisure=fitness_centre maps to softplay', () => {
    assertEqual(osmDiscovery.mapVenueType({ leisure: 'fitness_centre' }), 'softplay', 'Tag mapping');
  });
  
  test('amenity=community_centre maps to community_hall', () => {
    assertEqual(osmDiscovery.mapVenueType({ amenity: 'community_centre' }), 'community_hall', 'Tag mapping');
  });
  
  test('leisure=park maps to park', () => {
    assertEqual(osmDiscovery.mapVenueType({ leisure: 'park' }), 'park', 'Tag mapping');
  });
  
  test('leisure=playground maps to park', () => {
    assertEqual(osmDiscovery.mapVenueType({ leisure: 'playground' }), 'park', 'Tag mapping');
  });
  
  test('leisure=stadium maps to other', () => {
    assertEqual(osmDiscovery.mapVenueType({ leisure: 'stadium' }), 'other', 'Tag mapping');
  });
  
  test('amenity=gym maps to other', () => {
    assertEqual(osmDiscovery.mapVenueType({ amenity: 'gym' }), 'other', 'Tag mapping');
  });
  
  test('unmapped tags return other', () => {
    assertEqual(osmDiscovery.mapVenueType({ shop: 'clothes' }), 'other', 'Unmapped');
    assertEqual(osmDiscovery.mapVenueType({}), 'other', 'Empty tags');
  });
  
  test('multiple tags returns first match', () => {
    const tags = { leisure: 'park', amenity: 'community_centre' };
    assertEqual(osmDiscovery.mapVenueType(tags), 'park', 'First match');
  });
}

// CSV Type Mapping Tests
function testCSVTypeMapping() {
  console.log('\n--- CSV Type Mapping ---');
  
  test('leisure centre maps to softplay', () => {
    assertEqual(londonImport.mapVenueType('leisure centre'), 'softplay', 'Type mapping');
  });
  
  test('soft play maps to softplay', () => {
    assertEqual(londonImport.mapVenueType('soft play'), 'softplay', 'Type mapping');
  });
  
  test('softplay maps to softplay', () => {
    assertEqual(londonImport.mapVenueType('softplay'), 'softplay', 'Type mapping');
  });
  
  test('community hall maps to community_hall', () => {
    assertEqual(londonImport.mapVenueType('community hall'), 'community_hall', 'Type mapping');
  });
  
  test('village hall maps to community_hall', () => {
    assertEqual(londonImport.mapVenueType('village hall'), 'community_hall', 'Type mapping');
  });
  
  test('park maps to park', () => {
    assertEqual(londonImport.mapVenueType('park'), 'park', 'Type mapping');
  });
  
  test('playground maps to park', () => {
    assertEqual(londonImport.mapVenueType('playground'), 'park', 'Type mapping');
  });
  
  test('sports centre maps to other', () => {
    assertEqual(londonImport.mapVenueType('sports centre'), 'other', 'Type mapping');
  });
  
  test('gym maps to other', () => {
    assertEqual(londonImport.mapVenueType('gym'), 'other', 'Type mapping');
  });
  
  test('swimming pool maps to other', () => {
    assertEqual(londonImport.mapVenueType('swimming pool'), 'other', 'Type mapping');
  });
  
  test('unknown type returns other', () => {
    assertEqual(londonImport.mapVenueType('unknown venue type'), 'other', 'Unknown type');
  });
  
  test('case insensitive matching', () => {
    assertEqual(londonImport.mapVenueType('LEISURE CENTRE'), 'softplay', 'Upper case');
    assertEqual(londonImport.mapVenueType('Community Hall'), 'community_hall', 'Mixed case');
  });
}

// Cross-Source Consistency Tests
function testConsistency() {
  console.log('\n--- Cross-Source Consistency ---');
  
  const mappings = [
    { google: 'amusement_park', osm: { leisure: 'fitness_centre' }, csv: 'soft play', expected: 'softplay' },
    { google: 'community_center', osm: { amenity: 'community_centre' }, csv: 'community hall', expected: 'community_hall' },
    { google: 'park', osm: { leisure: 'park' }, csv: 'park', expected: 'park' },
    { google: 'playground', osm: { leisure: 'playground' }, csv: 'playground', expected: 'park' },
    { google: 'gym', osm: { amenity: 'gym' }, csv: 'gym', expected: 'other' },
  ];
  
  for (const mapping of mappings) {
    test(`Consistency: ${mapping.expected} across all sources`, () => {
      const googleResult = cronAgent.mapVenueType([mapping.google]);
      const osmResult = osmDiscovery.mapVenueType(mapping.osm);
      const csvResult = londonImport.mapVenueType(mapping.csv);
      
      assertEqual(googleResult, mapping.expected, 'Google Places');
      assertEqual(osmResult, mapping.expected, 'OSM');
      assertEqual(csvResult, mapping.expected, 'CSV');
    });
  }
}

// Main test runner
function runTests() {
  console.log('========================================');
  console.log('KidSpot London - Venue Categorization Tests');
  console.log('========================================');
  
  testGooglePlacesMapping();
  testOSMTagMapping();
  testCSVTypeMapping();
  testConsistency();
  
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed > 0) {
    console.log('\n❌ TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

runTests();