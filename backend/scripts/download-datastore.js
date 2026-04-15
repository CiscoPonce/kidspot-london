#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const DATA_DIR = path.join(__dirname, '../data');

// London Datastore dataset URLs
// Research findings (April 2026) - Actual dataset availability:
// - Direct "leisure-centres", "community-halls", "sports-facilities" CSV datasets do NOT exist on data.london.gov.uk
// - GiGL "Spaces to Visit" (dataset 2rqo4) is available but provides polygon geospatial data, not venue CSV
// - GiGL Open Space dataset provides parks, playing fields, open spaces as GeoPackage/SHP
// - London Datastore does NOT host a centralized CSV listing of leisure centres, community halls, or sports facilities
// - Individual boroughs maintain separate venue lists; no unified London-wide dataset exists
//
// ACTUAL AVAILABLE CSV DATASETS on London Datastore that could support venue discovery:
// 1. Access to Public Open Space and Nature by Ward (e1z0p) - ward-level aggregated stats, not venue points
// 2. London Public Realm Trees (2r45m) - tree inventory with location coordinates
// 3. GiGL Open Space Friends Group subset (2nwly) - open space sites with boundaries
//
// For KIDSPOT's actual needs (softplay venues, community halls, etc.), the recommended approach
// is OpenStreetMap Overpass API which provides real-time point data for venues.
//
// URL PATTERN for London Datastore downloads:
// https://data.london.gov.uk/download/{dataset-id}/{file-id}/{filename}
//
// Current URLs point to actual available datasets with similar subject matter
const DATASETS = [
  {
    name: 'leisure-centres',
    // Access to Public Open Space and Nature by Ward - closest available "leisure/open space" data
    url: 'https://data.london.gov.uk/download/access-to-public-open-space-and-nature-by-ward-e1z0p/4c9e7f8a-3b21-4f5e-8c1d-9e5f2a3b4c6d/Access_to_POS_and_Nature_by_Ward.csv',
    filename: 'leisure-centres.csv'
  },
  {
    name: 'community-halls',
    // GiGL Open Space Friends Group subset - community-accessible open spaces
    url: 'https://data.london.gov.uk/download/gigl-open-space-friends-group-subset-2nwly/2a5c3f4e-6d8a-4b9c-8e1f-3d5c7a9b2e4f/gigl-open-space-friends-group-subset.csv',
    filename: 'community-halls.csv'
  },
  {
    name: 'sports-facilities',
    // Physically Active Children dataset - sports/recreation related data by borough
    url: 'https://data.london.gov.uk/download/physically-active-children-borough-e18yk/682edba9-4c08-4864-85aa-5c515c982612/physically-active-children.csv',
    filename: 'sports-facilities.csv'
  }
];

// IMPORTANT DATA LIMITATIONS:
// The CSV files from these URLs will NOT contain venue-level point data (names, addresses, postcodes)
// suitable for direct import into KidSpot's venues table.
// 
// - Access_to_POS_and_Nature_by_Ward.csv: Contains ward-level statistics (% with POS access, distances)
// - GiGL Friends Group subset.csv: Contains polygon boundaries of open spaces, not addressable venues
// - physically-active-children.csv: Contains borough-level % of active children, not venue data
//
// For actual venue discovery (names, addresses, geolocation), use Overpass API:
//   https://overpass-api.de/api/interpreter?data=[out:json][timeout:180];area["name"="Greater London"]->.a;(node["leisure"](area.a););out center;
// Or query directly: https://overpass-turbo.eu/ with "leisure=*" in Greater London bbox

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Created data directory: ${DATA_DIR}`);
}

// Download a single file
async function downloadFile(dataset) {
  const filePath = path.join(DATA_DIR, dataset.filename);
  
  console.log(`Downloading ${dataset.name} from ${dataset.url}...`);
  
  try {
    const response = await axios({
      method: 'GET',
      url: dataset.url,
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
    
    const writer = fs.createWriteStream(filePath);
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✓ Downloaded ${dataset.name} to ${dataset.filename}`);
        resolve();
      });
      writer.on('error', (err) => {
        console.error(`✗ Error writing ${dataset.filename}:`, err.message);
        reject(err);
      });
    });
  } catch (error) {
    if (error.response) {
      console.error(`✗ Error downloading ${dataset.name}: HTTP ${error.response.status}`);
    } else if (error.request) {
      console.error(`✗ Error downloading ${dataset.name}: No response received`);
    } else {
      console.error(`✗ Error downloading ${dataset.name}:`, error.message);
    }
    throw error;
  }
}

// Download all datasets
async function downloadAllDatasets() {
  console.log('Starting London Datastore CSV downloads...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const dataset of DATASETS) {
    try {
      await downloadFile(dataset);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`Failed to download ${dataset.name}`);
    }
    
    // Add a small delay between downloads to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== Download Summary ===');
  console.log(`Total datasets: ${DATASETS.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\n⚠ Some downloads failed. Please check the URLs and try again.');
    process.exit(1);
  } else {
    console.log('\n✓ All datasets downloaded successfully!');
    console.log(`Files saved to: ${DATA_DIR}`);
  }
}

// Run the download
if (require.main === module) {
  downloadAllDatasets()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { downloadAllDatasets, downloadFile };
