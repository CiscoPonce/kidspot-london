#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Overpass API configuration
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Map OSM tags to our venue types
function mapVenueType(tags) {
  const typeMap = {
    'leisure=fitness_centre': 'softplay',
    'amenity=community_centre': 'community_hall',
    'leisure=park': 'park',
    'leisure=playground': 'park',
    'leisure=stadium': 'other',
    'amenity=gym': 'other'
  };
  
  // Check each tag combination
  for (const [tagKey, venueType] of Object.entries(typeMap)) {
    const [key, value] = tagKey.split('=');
    if (tags[key] === value) {
      return venueType;
    }
  }
  
  // Log unmapped tags for review
  console.warn(`Unmapped OSM tags: ${JSON.stringify(tags)}`);
  return 'other';
}

// OSM tags for child-friendly venues
const OSM_QUERIES = [
  {
    name: 'softplay',
    query: `
      [out:json][timeout:300];
      (
        node["leisure"="fitness_centre"](51.2,-0.5,51.7,0.3);
        way["leisure"="fitness_centre"](51.2,-0.5,51.7,0.3);
        relation["leisure"="fitness_centre"](51.2,-0.5,51.7,0.3);
      );
      out center;
    `
  },
  {
    name: 'community_hall',
    query: `
      [out:json][timeout:300];
      (
        node["amenity"="community_centre"](51.2,-0.5,51.7,0.3);
        way["amenity"="community_centre"](51.2,-0.5,51.7,0.3);
        relation["amenity"="community_centre"](51.2,-0.5,51.7,0.3);
      );
      out center;
    `
  },
  {
    name: 'park',
    query: `
      [out:json][timeout:300];
      (
        node["leisure"="park"](51.2,-0.5,51.7,0.3);
        way["leisure"="park"](51.2,-0.5,51.7,0.3);
        relation["leisure"="park"](51.2,-0.5,51.7,0.3);
      );
      out center;
    `
  }
];

// Insert venue into database
async function insertVenue(venue, venueType) {
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
        'osm',
        venue.id,
        venue.name || venue.tags.name || `OSM ${venue.id}`,
        venueType,
        venue.lat,
        venue.lon
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

// Query Overpass API
async function queryOverpass(query) {
  try {
    const response = await axios.post(OVERPASS_API_URL, query, {
      headers: {
        'Content-Type': 'text/plain'
      },
      timeout: 60000 // 60 second timeout
    });
    
    if (response.data && response.data.elements) {
      return response.data.elements;
    } else {
      console.error('Invalid Overpass API response');
      return [];
    }
  } catch (error) {
    console.error('Error querying Overpass API:', error.message);
    return [];
  }
}

// Discover venues from OSM
async function discoverVenuesFromOSM() {
  console.log('Starting OSM discovery for London...\n');
  
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');
    
    // Query each venue type
    for (const queryConfig of OSM_QUERIES) {
      console.log(`Searching for ${queryConfig.name}...`);
      
      const elements = await queryOverpass(queryConfig.query);
      console.log(`  Found ${elements.length} venues`);
      
      // Insert venues
      for (const element of elements) {
        totalProcessed++;
        
        // Extract coordinates
        let lat, lon;
        if (element.lat && element.lon) {
          lat = element.lat;
          lon = element.lon;
        } else if (element.center) {
          lat = element.center.lat;
          lon = element.center.lon;
        } else {
          console.warn(`  Skipping ${element.id} - no coordinates`);
          continue;
        }
        
        const venue = {
          id: element.id.toString(),
          name: element.tags?.name || `OSM ${element.id}`,
          lat: lat,
          lon: lon,
          tags: element.tags || {}
        };
        
        // Map OSM tags to venue type
        const venueType = mapVenueType(venue.tags);
        
        const result = await insertVenue(venue, venueType);
        
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Print summary
    console.log('\n=== Discovery Summary ===');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total duplicates: ${totalDuplicates}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('\n✓ OSM discovery complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run discovery
if (require.main === module) {
  discoverVenuesFromOSM()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { discoverVenuesFromOSM, queryOverpass };
