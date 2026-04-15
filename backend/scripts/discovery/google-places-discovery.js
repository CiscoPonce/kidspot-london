#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Venue type mappings for Google Places API
const VENUE_TYPES = [
  'amusement_park',
  'bowling_alley',
  'community_center',
  'gym',
  'park',
  'playground',
  'stadium',
  'swimming_pool',
  'tourist_attraction',
  'zoo'
];

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
  
  // Check if any of the venue's types match our mappings
  for (const googleType of googleTypes) {
    if (typeMap[googleType]) {
      return typeMap[googleType];
    }
  }
  
  return 'other';
}

// Search for venues in a specific area
async function searchVenuesInArea(lat, lon, radius, venueType) {
  try {
    const response = await axios.get(`${BASE_URL}/nearbysearch/json`, {
      params: {
        location: `${lat},${lon}`,
        radius: radius,
        type: venueType,
        key: GOOGLE_PLACES_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK' && response.data.results) {
      return response.data.results;
    } else if (response.data.status === 'ZERO_RESULTS') {
      return [];
    } else {
      console.error(`Google Places API error: ${response.data.status}`);
      return [];
    }
  } catch (error) {
    console.error(`Error searching for ${venueType}:`, error.message);
    return [];
  }
}

// Insert venue into database
async function insertVenue(venue) {
  try {
    const result = await pool.query(
      `INSERT INTO venues (
        source, source_id, name, type, lat, lon, last_scraped
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (source_id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        last_scraped = NOW()
      RETURNING id`,
      [
        'google',
        venue.place_id,
        venue.name,
        mapVenueType(venue.types),
        venue.geometry.location.lat,
        venue.geometry.location.lng
      ]
    );
    
    return { status: 'inserted', id: result.rows[0].id };
  } catch (error) {
    if (error.code === '23505') {
      return { status: 'duplicate', id: null };
    }
    console.error(`Error inserting venue ${venue.name}:`, error.message);
    return { status: 'error', id: null };
  }
}

// Discover venues in London
async function discoverVenuesInLondon() {
  console.log('Starting Google Places discovery for London...\n');
  
  // London center coordinates
  const londonCenter = { lat: 51.5074, lon: -0.1278 };
  const searchRadius = 50000; // 50km radius
  
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set in environment variables');
    process.exit(1);
  }
  
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');
    
    // Search for each venue type
    for (const venueType of VENUE_TYPES) {
      console.log(`Searching for ${venueType}...`);
      
      const venues = await searchVenuesInArea(
        londonCenter.lat,
        londonCenter.lon,
        searchRadius,
        venueType
      );
      
      console.log(`  Found ${venues.length} venues`);
      
      // Insert venues
      for (const venue of venues) {
        totalProcessed++;
        
        const result = await insertVenue(venue);
        
        if (result.status === 'inserted') {
          totalInserted++;
        } else if (result.status === 'duplicate') {
          totalDuplicates++;
        } else {
          totalErrors++;
        }
        
        if (totalProcessed % 10 === 0) {
          console.log(`    Progress: ${totalProcessed} processed, ${totalInserted} inserted, ${totalDuplicates} duplicates`);
        }
      }
      
      console.log(`  Complete: ${totalInserted} new venues\n`);
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Print summary
    console.log('\n=== Discovery Summary ===');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total duplicates: ${totalDuplicates}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('\n✓ Google Places discovery complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run discovery
if (require.main === module) {
  discoverVenuesInLondon()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { discoverVenuesInLondon, searchVenuesInArea };
