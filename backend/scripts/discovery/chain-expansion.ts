import { db } from '../../src/clients/db.js';
import { logger } from '../../src/config/logger.js';
import { googlePlacesService } from '../../src/services/googlePlacesService.js';
import { browserHeaders } from '../../src/utils/httpHeaders.js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'compass~crawler-google-places';

const CHAINS = [
  { name: 'Flip Out', type: 'softplay' },
  { name: 'Oxygen Activeplay', type: 'softplay' },
  { name: 'Oxygen Freejumping', type: 'softplay' },
  { name: 'Jump Giants', type: 'softplay' },
  { name: 'AirHop', type: 'softplay' },
  { name: 'Jump In Trampoline', type: 'softplay' },
  { name: 'Gravity MAX', type: 'softplay' },
  { name: 'Gravity Active', type: 'softplay' },
  { name: 'Kidspace', type: 'softplay' },
  { name: 'Ninja Warrior UK', type: 'softplay' },
  { name: 'Inflata Nation', type: 'softplay' },
  { name: 'Babylon Park', type: 'softplay' },
  { name: 'Gambado', type: 'softplay' },
  { name: 'Better Extreme', type: 'leisure_centre' },
  { name: 'Clip n Climb', type: 'leisure_centre' }
];

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export async function discoverChains(isDryRun: boolean = false) {
  logger.info(`Starting Targeted Chain Discovery${isDryRun ? ' (DRY RUN)' : ''}...`);

  const stats = { found: 0, inserted: 0, skipped: 0, failed: 0 };

  try {
    for (const chain of CHAINS) {
      logger.info(`Searching for chain: ${chain.name}...`);
      
      const searchString = `${chain.name} London UK`;
      let results: any[] = [];

      // Primary: Google Places Text Search
      try {
        const googleResults = await googlePlacesService.textSearch(searchString, {
          maxResults: 10,
          locationBias: { lat: 51.5074, lon: -0.1278 },
          radius: 50000 // 50km across London
        });

        if (googleResults.length > 0) {
          results = googleResults.map((r) => ({
            title: r.name,
            placeId: r.placeId,
            location: { lat: r.lat, lng: r.lon },
            website: r.website,
            phone: r.phone,
            totalScore: null,
            reviewsCount: null
          }));
          logger.info({ chain: chain.name, count: results.length }, 'Google Places results obtained');
        }
      } catch (err) {
        logger.warn({ err, chain: chain.name }, 'Google Places search failed, falling back to Apify/dummy');
      }

      // Fallback: Apify or dummy mode when Google Places returned no results
      if (results.length === 0) {
        if (!APIFY_TOKEN || APIFY_TOKEN.includes('dummy') || isDryRun) {
          logger.info(`Dummy/Dry-Run Mode: Simulating results for ${chain.name}`);
          results = [
            {
              title: `${chain.name} Test Location`,
              location: { lat: 51.5074 + (Math.random() - 0.5) * 0.1, lng: -0.1278 + (Math.random() - 0.5) * 0.1 },
              placeId: `dummy_${slugify(chain.name)}_${Math.floor(Math.random() * 1000)}`,
              website: `https://www.${slugify(chain.name)}.co.uk`,
              phone: '+44 20 0000 0000',
              totalScore: 4.5,
              reviewsCount: 100
            }
          ];
        } else {
          // Real Apify Search (Synchronous for this specialized discovery script)
          logger.info(`Triggering live Apify search for ${chain.name}...`);
          const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs`, {
            method: 'POST',
            headers: { ...browserHeaders(), 'Content-Type': 'application/json', 'Authorization': `Bearer ${APIFY_TOKEN}` },
            body: JSON.stringify({
              searchStringsArray: [searchString],
              maxCrawledPlacesPerSearch: 10,
              language: 'en',
              countryCode: 'gb',
            }),
          });

          if (!response.ok) {
            logger.error(`Apify search failed for ${chain.name}: ${response.statusText}`);
            continue;
          }

          const runData = await response.json() as any;
          const runId = runData.data.id;
          
          // Poll for results (since this is a one-off discovery script)
          logger.info(`Waiting for results (Run ID: ${runId})...`);
          let finished = false;
          while (!finished) {
            const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
              headers: { ...browserHeaders(), 'Authorization': `Bearer ${APIFY_TOKEN}` },
            });
            const statusData = await statusRes.json() as any;
            if (statusData.data.status === 'SUCCEEDED') {
              finished = true;
            } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(statusData.data.status)) {
              throw new Error(`Apify run ${runId} failed with status: ${statusData.data.status}`);
            } else {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }

          const datasetRes = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}/dataset/items`,
            {
              headers: { ...browserHeaders(), 'Authorization': `Bearer ${APIFY_TOKEN}` },
            },
          );
          results = await datasetRes.json() as any[];
        }
      }

      logger.info(`Found ${results.length} potential locations for ${chain.name}`);

      for (const item of results) {
        stats.found++;
        
        if (isDryRun) {
          logger.info(`[DRY RUN] Would insert: ${item.title} (${chain.type})`);
          continue;
        }

        try {
          const name = item.title;
          const sourceId = item.placeId;
          const lat = item.location?.lat ?? null;
          const lon = item.location?.lng ?? null;
          const slug = `${slugify(name)}-google-${sourceId}`;

          // Use the insert function logic
          const { rows } = await db.query(
            `INSERT INTO venues (
              source, source_id, name, type, lat, lon, slug, website, phone, rating, user_ratings_total, last_scraped, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), TRUE)
            ON CONFLICT (source, source_id) DO UPDATE SET
              name = EXCLUDED.name,
              type = EXCLUDED.type,
              lat = EXCLUDED.lat,
              lon = EXCLUDED.lon,
              website = COALESCE(NULLIF(EXCLUDED.website, ''), venues.website),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), venues.phone),
              rating = COALESCE(EXCLUDED.rating, venues.rating),
              user_ratings_total = COALESCE(EXCLUDED.user_ratings_total, venues.user_ratings_total),
              last_scraped = NOW()
            RETURNING id`,
            [
              'google',
              sourceId,
              name,
              chain.type,
              lat,
              lon,
              slug,
              item.website || null,
              item.phone || null,
              item.totalScore || null,
              item.reviewsCount || null
            ]
          );

          if (rows.length > 0) {
            stats.inserted++;
            logger.info(`Successfully processed venue: ${name} (ID: ${rows[0].id})`);
          }
        } catch (err: any) {
          logger.error({ err: err.message, venue: item.title }, 'Failed to insert chain venue');
          stats.failed++;
        }
      }
    }

    logger.info({ stats }, 'Chain discovery complete.');
    return stats;
  } catch (error) {
    logger.error({ err: error }, 'Targeted Chain Discovery failed');
    throw error;
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  discoverChains(args.includes('--dry-run'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
