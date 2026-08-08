import { db } from '../../src/clients/db.js';
import { logger } from '../../src/config/logger.js';
import { googlePlacesService } from '../../src/services/googlePlacesService.js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const LONDON_CENTER = { lat: 51.5074, lon: -0.1278 };
const SEARCH_RADIUS_M = 50000;

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
  { name: 'Clip n Climb', type: 'leisure_centre' },
  { name: "McDonald's", type: 'other' },
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
      let results: Awaited<ReturnType<typeof googlePlacesService.textSearch>> = [];

      if (isDryRun) {
        logger.info(`[DRY RUN] Would search Google Places for: ${searchString}`);
        continue;
      }

      results = await googlePlacesService.textSearch(searchString, {
        maxResults: 20,
        locationBias: LONDON_CENTER,
        radius: SEARCH_RADIUS_M,
      });

      results = results.filter((place) => place.businessStatus !== 'CLOSED_PERMANENTLY');

      logger.info(`Found ${results.length} potential locations for ${chain.name}`);

      for (const item of results) {
        stats.found++;

        try {
          const name = item.name!;
          const sourceId = item.placeId;
          const lat = item.lat;
          const lon = item.lon;
          const slug = `${slugify(name)}-google-${sourceId}`;

          const { rows } = await db.query(
            `INSERT INTO venues (
              source, source_id, name, type, lat, lon, slug, website, phone, last_scraped, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), TRUE)
            ON CONFLICT (source, source_id) DO UPDATE SET
              name = EXCLUDED.name,
              type = EXCLUDED.type,
              lat = EXCLUDED.lat,
              lon = EXCLUDED.lon,
              website = COALESCE(NULLIF(EXCLUDED.website, ''), venues.website),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), venues.phone),
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
            ]
          );

          if (rows.length > 0) {
            stats.inserted++;
            logger.info(`Successfully processed venue: ${name} (ID: ${rows[0].id})`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ err: message, venue: item.name }, 'Failed to insert chain venue');
          stats.failed++;
        }
      }

      // Rate limit between chain searches
      await new Promise((resolve) => setTimeout(resolve, 500));
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
