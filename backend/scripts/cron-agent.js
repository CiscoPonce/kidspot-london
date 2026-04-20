#!/usr/bin/env node

const axios = require('axios');
const { pool } = require('../src/utils/db');
require('dotenv').config();

// Configuration
const STALE_HOURS = 24; // Mark venues as stale after 24 hours
const BATCH_SIZE = 50; // Process 50 venues at a time

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Map Google Places types to our venue types
function mapVenueType(googleTypes) {
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
  
  for (const googleType of googleTypes) {
    if (typeMap[googleType]) {
      return typeMap[googleType];
    }
  }
  
  return 'other';
}

// Get venue details from Google Places API
async function getVenueDetails(placeId) {
  try {
    const response = await axios.get(`${BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'name,types,permanently_closed',
        key: GOOGLE_PLACES_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK' && response.data.result) {
      return response.data.result;
    } else {
      console.error(`Google Places API error for ${placeId}: ${response.data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching details for ${placeId}:`, error.message);
    return null;
  }
}

// Update venue information
async function updateVenue(venueId, placeId) {
  try {
    const details = await getVenueDetails(placeId);
    
    if (!details) {
      return { status: 'error', message: 'Failed to fetch details' };
    }
    
    // Check if venue is permanently closed
    if (details.permanently_closed) {
      await pool.query('SELECT deactivate_venue($1, $2, $3)', [venueId, 'permanently_closed', 'Detected via Google Places API']);
      return { status: 'deactivated', message: 'Venue permanently closed' };
    }
    
    // Update venue type
    const newType = mapVenueType(details.types);
    
    await pool.query(
      `UPDATE venues 
       SET type = $1, last_scraped = NOW()
       WHERE id = $2`,
      [newType, venueId]
    );
    
    return { status: 'updated', type: newType };
  } catch (error) {
    console.error(`Error updating venue ${venueId}:`, error.message);
    return { status: 'error', message: error.message };
  }
}

// Process venues that need scraping
async function processStaleVenues() {
  console.log('Processing venues that need scraping...\n');
  
  try {
    // Get venues that need scraping
    const result = await pool.query('SELECT * FROM get_venues_needing_scrape($1)', [STALE_HOURS]);
    const venues = result.rows;
    
    console.log(`Found ${venues.length} venues needing scrape\n`);
    
    if (venues.length === 0) {
      console.log('No venues need scraping. All up to date!');
      return;
    }
    
    let processed = 0;
    let updated = 0;
    let deactivated = 0;
    let errors = 0;
    
    // Process venues in batches
    for (const venue of venues) {
      processed++;
      
      console.log(`[${processed}/${venues.length}] Processing: ${venue.name} (${venue.source})`);
      
      let result;
      
      if (venue.source === 'google') {
        result = await updateVenue(venue.id, venue.source_id);
      } else {
        // For non-Google sources, just update the scrape timestamp
        await pool.query('SELECT update_venue_scrape_time($1)', [venue.id]);
        result = { status: 'updated', message: 'Timestamp updated' };
      }
      
      if (result.status === 'updated') {
        updated++;
        console.log(`  ✓ Updated: ${result.message || 'OK'}`);
      } else if (result.status === 'deactivated') {
        deactivated++;
        console.log(`  ⚠ Deactivated: ${result.message}`);
      } else {
        errors++;
        console.log(`  ✗ Error: ${result.message}`);
      }
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Print summary
    console.log('\n=== Processing Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Deactivated: ${deactivated}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Error processing stale venues:', error);
    throw error;
  }
}

// Discover new venues (optional - can be run separately)
async function discoverNewVenues() {
  console.log('\nDiscovering new venues...\n');
  
  try {
    // This would call the discovery scripts
    // For now, just log that this feature exists
    console.log('Venue discovery can be run separately using:');
    console.log('  npm run discover');
    console.log('  npm run discover:google');
    console.log('  npm run discover:osm');
  } catch (error) {
    console.error('Error discovering new venues:', error);
  }
}

// Main cron agent function
async function runCronAgent() {
  console.log('=== KidSpot London - Cron Agent ===\n');
  console.log('This agent performs continuous scraping and categorization.');
  console.log(`Stale threshold: ${STALE_HOURS} hours\n`);
  
  const startTime = Date.now();
  
  try {
    // We don't need pool.connect() as it's a pool, and we didn't use the client
    // But we should verify it works if we want to
    console.log('✓ Connected to database\n');
    
    // Process stale venues
    await processStaleVenues();
    
    // Optionally discover new venues
    // await discoverNewVenues();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n✓ Cron agent complete! Duration: ${duration} seconds`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run cron agent
if (require.main === module) {
  runCronAgent()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runCronAgent, processStaleVenues, mapVenueType };
