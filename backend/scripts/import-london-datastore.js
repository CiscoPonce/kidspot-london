#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const csv = require('csv-parser');
const axios = require('axios');
require('dotenv').config();

// Configuration
const DATA_DIR = path.join(__dirname, '../data');
const BATCH_SIZE = 100;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Geocoding cache to avoid duplicate API calls
const geocodingCache = new Map();

// Geocode postcode using OpenStreetMap Nominatim API (free, no API key required)
async function geocodePostcode(postcode) {
  if (!postcode) {
    return { lat: null, lon: null };
  }
  
  // Check cache first
  const cacheKey = postcode.toUpperCase().trim();
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey);
  }
  
  try {
    // Use OpenStreetMap Nominatim API
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: postcode,
        format: 'json',
        countrycodes: 'gb',
        limit: 1
      },
      headers: {
        'User-Agent': 'KidSpot-London/1.0 (data-import)'
      },
      timeout: 5000
    });
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const coords = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon)
      };
      
      // Cache the result
      geocodingCache.set(cacheKey, coords);
      
      // Add a small delay to respect Nominatim's rate limit (1 request per second max)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return coords;
    } else {
      console.warn(`No geocoding results for postcode: ${postcode}`);
      return { lat: null, lon: null };
    }
  } catch (error) {
    console.error(`Geocoding error for ${postcode}:`, error.message);
    return { lat: null, lon: null };
  }
}

// Map CSV type to our venue types
function mapVenueType(csvType) {
  const typeMap = {
    'leisure centre': 'softplay',
    'soft play': 'softplay',
    'softplay': 'softplay',
    'community hall': 'community_hall',
    'village hall': 'community_hall',
    'park': 'park',
    'playground': 'park',
    'sports centre': 'other',
    'gym': 'other',
    'swimming pool': 'other'
  };
  
  const normalizedType = csvType.toLowerCase().trim();
  return typeMap[normalizedType] || 'other';
}

// Insert venue into database (minimal schema)
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
        venue.source,
        venue.source_id,
        venue.name,
        venue.type,
        venue.lat,
        venue.lon
      ]
    );
    
    return { status: 'inserted', id: result.rows[0].id };
  } catch (error) {
    // Check if it's a duplicate (violates unique constraint on source_id)
    if (error.code === '23505') {
      return { status: 'duplicate', id: null };
    }
    console.error(`Error inserting venue ${venue.name}:`, error.message);
    return { status: 'error', id: null };
  }
}

// Process CSV file
async function processCSV(filePath, source) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          resolve(results);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Import venues from CSV data
async function importVenues(csvData, source) {
  let processed = 0;
  let inserted = 0;
  let duplicates = 0;
  let errors = 0;
  let skipped = 0;
  
  console.log(`Processing ${csvData.length} rows from ${source}...`);
  
  for (const row of csvData) {
    processed++;
    
    try {
      // Extract venue data from CSV row
      // Note: Column names may vary depending on the actual CSV structure
      const name = row.name || row.Name || row.venue_name || '';
      const postcode = row.postcode || row.Postcode || row.post_code || '';
      const csvType = row.type || row.Type || row.venue_type || 'other';
      
      // Skip rows without required fields
      if (!name || !postcode) {
        skipped++;
        continue;
      }
      
      // Generate source_id from row data
      const sourceId = `${source}_${processed}`;
      
      // Map venue type
      const type = mapVenueType(csvType);
      
      // Geocode postcode
      const coords = await geocodePostcode(postcode);
      
      if (!coords.lat || !coords.lon) {
        console.warn(`Skipping ${name} - could not geocode postcode ${postcode}`);
        skipped++;
        continue;
      }
      
      // Create venue object (minimal schema - only name, location, type, source)
      const venue = {
        source: source,
        source_id: sourceId,
        name: name,
        type: type,
        lat: coords.lat,
        lon: coords.lon
      };
      
      // Insert venue
      const result = await insertVenue(venue);
      
      if (result.status === 'inserted') {
        inserted++;
      } else if (result.status === 'duplicate') {
        duplicates++;
      } else {
        errors++;
      }
      
      // Log progress every 50 venues
      if (processed % 50 === 0) {
        console.log(`  Progress: ${processed} processed, ${inserted} inserted, ${duplicates} duplicates, ${errors} errors, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error processing row ${processed}:`, error.message);
      errors++;
    }
  }
  
  return { processed, inserted, duplicates, errors, skipped };
}

// Main import function
async function importAllData() {
  console.log('Starting London Datastore import (minimal schema)...\n');
  console.log('Note: Only storing name, location, type, and source.');
  console.log('Full venue details will be fetched on-demand via agentic search.\n');
  
  try {
    // Connect to database
    await pool.connect();
    console.log('✓ Connected to database\n');
    
    // Get list of CSV files in data directory
    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.csv'));
    
    if (files.length === 0) {
      console.log('No CSV files found in data directory. Run download script first.');
      process.exit(1);
    }
    
    console.log(`Found ${files.length} CSV files to import\n`);
    
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    
    // Process each CSV file
    for (const file of files) {
      const filePath = path.join(DATA_DIR, file);
      const source = path.basename(file, '.csv');
      
      console.log(`\n--- Processing ${file} ---`);
      
      try {
        const csvData = await processCSV(filePath, source);
        const results = await importVenues(csvData, source);
        
        totalProcessed += results.processed;
        totalInserted += results.inserted;
        totalDuplicates += results.duplicates;
        totalErrors += results.errors;
        totalSkipped += results.skipped;
        
        console.log(`\n✓ ${file} complete:`);
        console.log(`  Processed: ${results.processed}`);
        console.log(`  Inserted: ${results.inserted}`);
        console.log(`  Duplicates: ${results.duplicates}`);
        console.log(`  Errors: ${results.errors}`);
        console.log(`  Skipped: ${results.skipped}`);
      } catch (error) {
        console.error(`✗ Error processing ${file}:`, error.message);
        totalErrors++;
      }
    }
    
    // Print summary
    console.log('\n=== Import Summary ===');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total duplicates: ${totalDuplicates}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total skipped: ${totalSkipped}`);
    console.log(`\n✓ Import complete!`);
    console.log(`\nNote: ${totalInserted} venue references stored in database.`);
    console.log(`Full venue details (address, phone, website, reviews) will be fetched on-demand.`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import
if (require.main === module) {
  importAllData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { importAllData, importVenues, geocodePostcode, mapVenueType };
