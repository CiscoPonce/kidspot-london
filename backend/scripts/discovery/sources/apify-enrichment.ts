import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'compass~crawler-google-places';

export async function enrichViaApify(limit: number = 20) {
  logger.info(`Starting Apify Enrichment batch for up to ${limit} venues...`);

  let stats = { enriched: 0, skipped: 0, failed: 0 };

  try {
    // 1. Fetch high-value venues missing website or phone
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon 
       FROM venues 
       WHERE is_active = TRUE 
       AND type IN ('softplay', 'leisure_centre', 'museum', 'library')
       AND (website IS NULL OR phone IS NULL)
       ORDER BY kid_score DESC NULLS LAST, id ASC
       LIMIT $1`,
      [limit]
    );

    if (venues.length === 0) {
      logger.info('No venues require enrichment. Exiting.');
      return stats;
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
        reviewsCount: 100 + index * 10,
        openingHours: [
          { day: 'Monday', hours: '9 AM - 5 PM' },
          { day: 'Tuesday', hours: '9 AM - 5 PM' },
          { day: 'Wednesday', hours: '9 AM - 5 PM' },
          { day: 'Thursday', hours: '9 AM - 5 PM' },
          { day: 'Friday', hours: '9 AM - 5 PM' },
          { day: 'Saturday', hours: '10 AM - 4 PM' },
          { day: 'Sunday', hours: 'Closed' }
        ],
        imageUrls: [`https://images.unsplash.com/photo-1566433316213-3fe62ca97277?q=80&w=400`]
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
        if (response.status === 402) {
          logger.error('Apify run failed: Insufficient funds/credits. Please top up your Apify account.');
          throw new Error('Apify insufficient funds');
        }
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
      const searchStr = `${venue.name} London UK`;
      
      let item = null;
      if (!APIFY_TOKEN || APIFY_TOKEN.includes('dummy')) {
        item = enrichedData.find(d => d.searchString === searchStr);
      } else {
        const firstWord = venue.name.split(' ')[0].toLowerCase();
        item = enrichedData.find(d => (d.title || '').toLowerCase().includes(firstWord));
      }

      if (item) {
        const cleanPhone = item.phone ? item.phone.replace(/\s+/g, '') : null;

        await db.query(
          `UPDATE venues 
           SET website = COALESCE($1, website),
               phone = COALESCE($2, phone),
               rating = COALESCE($3, rating),
               user_ratings_total = COALESCE($4, user_ratings_total),
               opening_hours = COALESCE($5, opening_hours),
               images = COALESCE($6, images),
               enriched_at = NOW()
           WHERE id = $7`,
          [
            item.website || null, 
            cleanPhone, 
            item.totalScore || null, 
            item.reviewsCount || null,
            item.openingHours || null,
            item.imageUrls || null,
            venue.id
          ]
        );
        logger.info(`Enriched venue ID ${venue.id}: ${venue.name}`);
        stats.enriched++;
      } else {
        await db.query(`UPDATE venues SET enriched_at = NOW() WHERE id = $1`, [venue.id]);
        logger.warn(`No Apify match found for venue ID ${venue.id}: ${venue.name}`);
        stats.skipped++;
      }
    }

    logger.info('Apify Enrichment batch completed successfully.');
    return stats;
  } catch (error) {
    logger.error({ err: error }, 'Apify Enrichment failed');
    stats.failed++;
    throw error;
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enrichViaApify()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
