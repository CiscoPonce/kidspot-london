#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const DATA_DIR = path.join(__dirname, '../data');

// London Datastore dataset URLs (verified April 2026)
//
// WORKING DATASETS FOUND:
// 1. Cultural Infrastructure Map (2ko88) - Contains CSV files with actual venue point locations
//    including community centres, arts centres, pubs, music venues, theatres, museums, etc.
//    Each venue has name, address, latitude, longitude coordinates.
// 2. Physically Active Children (e18yk) - Sports/recreation data by borough
//
// URL PATTERN for London Datastore downloads:
// https://data.london.gov.uk/download/{dataset-id}/{file-id}/{filename}
//
// IMPORTANT NOTE: GiGL "Spaces to Visit" and "Open Space Friends Group" datasets were
// WITHDRAWN from open data in October 2025. The URLs in the original script return 404.
//
// Also note: The 2019 Cultural Infrastructure Map datasets (below) are older but still
// provide valid point-location venue data. For production use, consider the 2023/2024
// datasets via the Cultural Infrastructure Map web app at apps.london.gov.uk/cim/
const DATASETS = [
  {
    name: 'leisure-centres',
    // Arts centres from Cultural Infrastructure Map 2019 - multi-use cultural venues
    url: 'https://data.london.gov.uk/download/2ko88/bec79216-7a51-4810-89d5-da8cc44d8458/Arts_centres.csv',
    filename: 'leisure-centres.csv'
  },
  {
    name: 'community-halls',
    // Community centres from Cultural Infrastructure Map 2019 - publicly accessible community venues
    url: 'https://data.london.gov.uk/download/2ko88/a8625bba-addb-4fae-a737-244b2281f429/2019%20publication%20-%20Community_centres%20%28Nov%202023%29.csv',
    filename: 'community-halls.csv'
  },
  {
    name: 'sports-facilities',
    // Physically Active Children dataset - sports participation data by borough
    url: 'https://data.london.gov.uk/download/e18yk/682edba9-4c08-4864-85aa-5c515c982612/physically-active-children.csv',
    filename: 'sports-facilities.csv'
  }
];

// DATA NOTES:
// - Arts_centres.csv: Contains arts centres with name, address, lat/lon coordinates
// - Community_centres.csv: Contains community centres with name, address, lat/lon coordinates
// - physically-active-children.csv: Borough-level sports participation statistics (not venue locations)

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
