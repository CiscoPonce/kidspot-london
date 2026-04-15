#!/usr/bin/env node

const { discoverVenuesInLondon } = require('./google-places-discovery');
const { discoverVenuesFromOSM } = require('./osm-discovery');

async function runAllDiscovery() {
  console.log('=== KidSpot London - Venue Discovery ===\n');
  console.log('This script discovers new venues from multiple sources.');
  console.log('Only minimal data is stored (name, location, type, source).\n');
  
  const startTime = Date.now();
  
  try {
    // Run Google Places discovery
    console.log('\n--- Google Places Discovery ---\n');
    await discoverVenuesInLondon();
    
    // Run OSM discovery
    console.log('\n--- OpenStreetMap Discovery ---\n');
    await discoverVenuesFromOSM();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n=== All Discovery Complete ===');
    console.log(`Total duration: ${duration} seconds`);
    console.log('\nNext steps:');
    console.log('1. Run verification: npm run verify');
    console.log('2. Set up cron agent for continuous discovery');
    console.log('3. Implement agentic search for full venue details');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run all discovery
if (require.main === module) {
  runAllDiscovery()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAllDiscovery };
