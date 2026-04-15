#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Verify import
async function verifyImport() {
  console.log('Verifying venue data import (minimal schema)...\n');
  
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');
    
    // Query total venue count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM venues');
    const totalCount = parseInt(totalResult.rows[0].count);
    console.log(`Total venues in database: ${totalCount}`);
    
    // Query venues by source
    const sourceResult = await pool.query(
      'SELECT source, COUNT(*) as count FROM venues GROUP BY source ORDER BY source'
    );
    console.log('\nVenues by source:');
    for (const row of sourceResult.rows) {
      console.log(`  ${row.source}: ${row.count}`);
    }
    
    // Query venues by type
    const typeResult = await pool.query(
      'SELECT type, COUNT(*) as count FROM venues GROUP BY type ORDER BY type'
    );
    console.log('\nVenues by type:');
    for (const row of typeResult.rows) {
      console.log(`  ${row.type}: ${row.count}`);
    }
    
    // Query sponsor statistics
    const sponsorResult = await pool.query('SELECT * FROM get_sponsor_stats()');
    console.log('\nSponsor statistics:');
    for (const row of sponsorResult.rows) {
      console.log(`  ${row.tier}: ${row.count} (${row.percentage}%)`);
    }
    
    // Query sample venues
    const sampleResult = await pool.query('SELECT * FROM venues LIMIT 5');
    console.log('\nSample venues:');
    for (const row of sampleResult.rows) {
      console.log(`  - ${row.name} (${row.type})`);
      console.log(`    Location: ${row.lat}, ${row.lon}`);
      console.log(`    Source: ${row.source}`);
      console.log(`    Sponsor Tier: ${row.sponsor_tier || 'none'}`);
      console.log(`    Last Scraped: ${row.last_scraped || 'never'}`);
    }
    
    // Verify spatial data
    console.log('\nVerifying spatial data...');
    const spatialResult = await pool.query(
      'SELECT name, lat, lon FROM venues LIMIT 5'
    );
    console.log('Spatial coordinates:');
    for (const row of spatialResult.rows) {
      console.log(`  ${row.name}: ${row.lat}, ${row.lon}`);
    }
    
    // Test spatial query
    console.log('\nTesting spatial query (venues within 5 miles of central London)...');
    const spatialQueryResult = await pool.query(
      `SELECT * FROM search_venues_by_radius(51.5074, -0.1278, 8046.72, NULL, 10)`
    );
    
    if (spatialQueryResult.rows.length > 0) {
      console.log('Found venues within radius:');
      for (const row of spatialQueryResult.rows) {
        console.log(`  - ${row.name} (${row.type}): ${row.distance_miles.toFixed(2)} miles (Sponsor: ${row.sponsor_tier || 'none'})`);
      }
    } else {
      console.log('  No venues found within radius');
    }
    
    // Check for venues without coordinates
    const noCoordsResult = await pool.query(
      "SELECT COUNT(*) as count FROM venues WHERE lat IS NULL OR lon IS NULL"
    );
    const noCoordsCount = parseInt(noCoordsResult.rows[0].count);
    if (noCoordsCount > 0) {
      console.log(`\n⚠ Warning: ${noCoordsCount} venues without coordinates`);
    } else {
      console.log('\n✓ All venues have coordinates');
    }
    
    // Check for inactive venues
    const inactiveResult = await pool.query(
      "SELECT COUNT(*) as count FROM venues WHERE is_active = FALSE"
    );
    const inactiveCount = parseInt(inactiveResult.rows[0].count);
    if (inactiveCount > 0) {
      console.log(`Inactive venues: ${inactiveCount}`);
    } else {
      console.log('✓ All venues are active');
    }
    
    // Check for venues needing scrape
    const staleResult = await pool.query('SELECT * FROM get_venues_needing_scrape(24)');
    console.log(`\nVenues needing scrape (stale > 24 hours): ${staleResult.rows.length}`);
    
    // Summary
    console.log('\n=== Verification Summary ===');
    console.log(`Total venues: ${totalCount}`);
    console.log(`Sources: ${sourceResult.rows.length}`);
    console.log(`Types: ${typeResult.rows.length}`);
    console.log(`Spatial queries: ✓ Working`);
    console.log(`Venues without coordinates: ${noCoordsCount}`);
    console.log(`Inactive venues: ${inactiveCount}`);
    console.log(`Venues needing scrape: ${staleResult.rows.length}`);
    
    if (totalCount > 0 && noCoordsCount === 0) {
      console.log('\n✓ Import verification successful!');
      console.log('\nNote: Only minimal venue data stored (name, location, type, source).');
      console.log('Full venue details will be fetched on-demand via agentic search.');
    } else {
      console.log('\n⚠ Import verification found issues');
    }
    
  } catch (error) {
    console.error('Error during verification:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
if (require.main === module) {
  verifyImport()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { verifyImport };
