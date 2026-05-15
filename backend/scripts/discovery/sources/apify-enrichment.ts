import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'compass~crawler-google-places';
const BATCH_SIZE = 20;

export async function runApifyEnrichment() {
  logger.info('Starting Apify Enrichment batch...');

  try {
    // 1. Fetch up to 20 high-value venues missing website or phone
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon 
       FROM venues 
       WHERE is_active = TRUE 
       AND type IN ('softplay', 'leisure_centre', 'museum', 'library')
       AND (website IS NULL OR phone IS NULL)
       ORDER BY kid_score DESC NULLS LAST, id ASC
       LIMIT $1`,
      [BATCH_SIZE]
    );

    if (venues.length === 0) {
      logger.info('No venues require enrichment. Exiting.');
      return;
    }

    logger.info(`Found ${venues.length} venues for enrichment.`);

    // 2. Construct search strings
    const searchStrings = venues.map((v) => `${v.name} London UK`);

    let enrichedData: any[] = [];

    // 3. Trigger Apify Actor or use dummy responses
    if (!APIFY_TOKEN || APIFY_TOKEN.includes('dummy')) {
      logger.info('Using dummy Apify execution for prototype...');
      enrichedData = venues.map((v, index) => ({
        searchString: `${v.name} London UK`,
        website: `https://www.example${index}.com`,
        phone: `+44 20 7946 000${index % 10}`,
        totalScore: 4.5 + (index % 5) * 0.1,
        reviewsCount: 100 + index * 10
      }));
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      logger.info('Triggering live Apify Actor...');
      const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: searchStrings,
          maxCrawledPlacesPerSearch: 1,
          language: 'en',
          countryCode: 'gb'
        })
      });

      if (!response.ok) {
        throw new Error(`Apify run trigger failed: ${response.statusText}`);
      }

      const runData = await response.json();
      const runId = runData.data.id;
      logger.info(`Apify run started with ID: ${runId}. Polling for completion...`);

      // Poll until ready
      let isReady = false;
      while (!isReady) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
        const statusData = await statusRes.json();
        const status = statusData.data.status;
        
        if (status === 'SUCCEEDED') {
          isReady = true;
        } else if (status === 'FAILED' || status === 'ABORTED') {
          throw new Error(`Apify run failed with status: ${status}`);
        } else {
          logger.info(`Apify run status: ${status}. Waiting...`);
        }
      }

      // Fetch dataset
      const datasetId = runData.data.defaultDatasetId;
      const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
      enrichedData = await datasetRes.json();
    }

    logger.info(`Retrieved ${enrichedData.length} records from Apify.`);

    // 4. Update the database
    for (const venue of venues) {
      // Find the corresponding result. We assume the search string matches or we just pick by index for dummy
      const searchStr = `${venue.name} London UK`;
      // Real apify data might not echo the exact searchString back in an easy way without 'searchString' in customData,
      // but typically the title will be similar. For simplicity, we match by assuming order or finding a close match.
      // In this basic version, we just match by index if we're generating dummy, or check if title includes venue name.
      
      let item = null;
      if (!APIFY_TOKEN || APIFY_TOKEN.includes('dummy')) {
        item = enrichedData.find(d => d.searchString === searchStr);
      } else {
        // Simple heuristic: title contains a word from the venue name (ignoring case)
        const firstWord = venue.name.split(' ')[0].toLowerCase();
        item = enrichedData.find(d => (d.title || '').toLowerCase().includes(firstWord));
      }

      if (item) {
        // Strip whitespace from phone
        const cleanPhone = item.phone ? item.phone.replace(/\s+/g, '') : null;

        await db.query(
          `UPDATE venues 
           SET website = COALESCE($1, website),
               phone = COALESCE($2, phone),
               rating = COALESCE($3, rating),
               user_ratings_total = COALESCE($4, user_ratings_total),
               enriched_at = NOW()
           WHERE id = $5`,
          [item.website || null, cleanPhone, item.totalScore || null, item.reviewsCount || null, venue.id]
        );
        logger.info(`Enriched venue ID ${venue.id}: ${venue.name}`);
      } else {
        // Just update enriched_at so we don't try again right away
        await db.query(`UPDATE venues SET enriched_at = NOW() WHERE id = $1`, [venue.id]);
        logger.warn(`No Apify match found for venue ID ${venue.id}: ${venue.name}`);
      }
    }

    logger.info('Apify Enrichment batch completed successfully.');
  } catch (error) {
    logger.error({ err: error }, 'Apify Enrichment failed');
    throw error;
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runApifyEnrichment()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
