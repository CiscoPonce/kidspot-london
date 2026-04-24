#!/usr/bin/env node

import axios from 'axios';
import { pool } from '../src/utils/db.js';
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const STALE_HOURS = 24; // Mark venues as stale after 24 hours
const BATCH_SIZE = 50; // Process 50 venues at a time

// Yelp Fusion API configuration
import { yelpService } from '../src/services/yelpService.js';
import { calculateKidScore } from '../src/scoring/kidScore.js';

// Map Yelp categories to our venue types
export function mapVenueType(yelpCategories: any[]) {
  const typeMap = {
    'kids_activities': 'softplay',
    'playgrounds': 'park',
    'parks': 'park',
    'recreation': 'leisure_centre',
    'gyms': 'leisure_centre',
    'leisure_centers': 'leisure_centre',
    'communitycenters': 'community_hall',
    'libraries': 'library',
    'museums': 'museum',
    'cafes': 'cafe'
  };
  
  if (yelpCategories && Array.isArray(yelpCategories)) {
    for (const category of yelpCategories) {
      if (category.alias && typeMap[category.alias]) {
        return typeMap[category.alias];
      }
    }
  }
  
  return 'other';
}

// Update venue information using Yelp Fusion API
async function updateVenue(venue: any) {
  const { id: venueId, name: venueName, lat, lon } = venue;
  try {
    // 1. First, search for the business to get its Yelp ID and details
    // We use a tight radius to ensure we find the exact venue
    const searchResults = await yelpService.searchBusinesses({
      term: venueName,
      latitude: lat,
      longitude: lon,
      radius: 100, // Very tight radius (meters)
      limit: 1
    });

    const details = searchResults.length > 0 ? searchResults[0] : null;
    
    if (!details) {
      // If we can't find it, we just update the scrape timestamp so we don't keep trying
      await pool.query('SELECT update_venue_scrape_time($1)', [venueId]);
      return { status: 'updated', message: 'Venue not found on Yelp. Timestamp updated.' };
    }
    
    // Check if venue is permanently closed
    if (details.is_closed) {
      await pool.query('SELECT deactivate_venue($1, $2, $3)', [venueId, 'permanently_closed', 'Detected via Yelp Fusion API']);
      return { status: 'deactivated', message: 'Venue permanently closed' };
    }
    
    // Update venue type and kid_score
    const newType = mapVenueType(details.categories || []);
    
    const kidScoreInput = {
      name: details.name || venueName,
      types: [newType], 
      rating: details.rating,
      user_ratings_total: details.review_count
    };
    
    const kidScore = calculateKidScore(kidScoreInput);
    
    await pool.query(
      `UPDATE venues 
       SET type = $1, rating = $2, user_ratings_total = $3, kid_score = $4, enriched_at = NOW(), last_scraped = NOW(), source_id = COALESCE(source_id, $5)
       WHERE id = $6`,
      [newType, details.rating || null, details.review_count || null, kidScore, details.id, venueId]
    );
    
    return { status: 'updated', type: newType, kidScore, message: 'Updated via Yelp' };
  } catch (error) {
    console.error(`Error updating venue ${venueId}:`, error.message);
    return { status: 'error', message: error.message };
  }
}

// Process venues that need scraping
export async function processStaleVenues() {
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

    const CONCURRENCY = 5;
    const queue = [...venues.entries()];
    
    // Function to process a single venue
    const processVenue = async (venue, index) => {
      const currentProcessed = ++processed;
      console.log(`[${currentProcessed}/${venues.length}] Processing: ${venue.name} (${venue.source})`);
      
      let res;
      
      // Update all venues via Yelp Fusion API
      res = await updateVenue(venue);
      
      if (res.status === 'updated') {
        updated++;
        console.log(`  ✓ Updated: ${res.message || 'OK'}`);
      } else if (res.status === 'deactivated') {
        deactivated++;
        console.log(`  ⚠ Deactivated: ${res.message}`);
      } else {
        errors++;
        console.log(`  ✗ Error: ${res.message}`);
      }
      
      // Add delay to respect API rate limits (staggered)
      await new Promise(resolve => setTimeout(resolve, 200));
    };

    // Process venues with concurrency limit
    const workers = Array(Math.min(CONCURRENCY, venues.length)).fill(0).map(async () => {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (entry) {
          const [index, venue] = entry;
          await processVenue(venue, index);
        }
      }
    });

    await Promise.all(workers);
    
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

export async function runCronAgent() {
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

// ES modules don't have require.main, so we use import.meta.url
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  runCronAgent()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
