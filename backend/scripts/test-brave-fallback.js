/**
 * Test script for Brave Search Fallback mechanism
 * Tests /api/search/venues when local DB returns 0 results
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// API base URL
const API_BASE = process.env.API_BASE || 'http://localhost:4000';

async function runTest() {
  console.log('='.repeat(60));
  console.log('KidSpot Brave Search Fallback Test');
  console.log('='.repeat(60));
  console.log();

  try {
    // 1. Search in a location that likely has no venues in our DB (e.g., middle of the Atlantic or a random US city)
    // Coordinates for a place far from London, but where Brave might find something (e.g., New York)
    const lat = 40.7128;
    const lon = -74.0060;
    const radius = 5;

    console.log(`Searching near New York (lat=${lat}, lon=${lon}) to trigger fallback...`);
    
    const response = await fetch(`${API_BASE}/api/search/venues?lat=${lat}&lon=${lon}&radius_miles=${radius}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('Response metadata:');
    console.log(JSON.stringify(data.meta, null, 2));

    if (data.meta.fallback_triggered) {
      console.log('\n✓ SUCCESS: Fallback was triggered!');
      console.log(`✓ Source: ${data.meta.fallback_source}`);
      console.log(`✓ Results found: ${data.data.total}`);
      
      if (data.data.regular.venues.length > 0) {
        console.log('\nSample Fallback Venue:');
        const venue = data.data.regular.venues[0];
        console.log(`- Name: ${venue.name}`);
        console.log(`- ID: ${venue.id}`);
        console.log(`- Source: ${venue.source}`);
        
        // Test the details endpoint for a fallback venue
        console.log(`\nTesting details for fallback venue ID: ${venue.id}...`);
        const detailsResponse = await fetch(`${API_BASE}/api/search/venues/${venue.id}/details`);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.success) {
          console.log('✓ SUCCESS: Fallback details retrieved!');
          console.log(`- Address: ${detailsData.data.details?.address || 'N/A'}`);
          console.log(`- Website: ${detailsData.data.details?.website || 'N/A'}`);
        } else {
          console.log('✗ FAILED: Could not retrieve fallback details');
          console.log(JSON.stringify(detailsData, null, 2));
        }
      }
    } else {
      console.log('\n✗ FAILED: Fallback was NOT triggered.');
      if (data.data.total > 0) {
        console.log(`Found ${data.data.total} results in local DB. Try a different location.`);
      } else {
        console.log('Check if BRAVE_API_KEY is set in .env and the backend is running.');
      }
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await pool.end();
    console.log('\nTest complete.');
  }
}

runTest().catch(console.error);
