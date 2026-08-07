import { db } from '../../../src/clients/db.js';
import { googlePlacesService } from '../../../src/services/googlePlacesService.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';

export interface GooglePlacesDiscoveryResult {
  discovered: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

const LONDON_BOROUGHS = [
  'Barking and Dagenham', 'Barnet', 'Bexley', 'Brent', 'Bromley',
  'Camden', 'City of London', 'Croydon', 'Ealing', 'Enfield',
  'Greenwich', 'Hackney', 'Hammersmith and Fulham', 'Haringey',
  'Harrow', 'Havering', 'Hillingdon', 'Hounslow', 'Islington',
  'Kensington and Chelsea', 'Kingston upon Thames', 'Lambeth',
  'Lewisham', 'Merton', 'Newham', 'Redbridge', 'Richmond upon Thames',
  'Southwark', 'Sutton', 'Tower Hamlets', 'Waltham Forest',
  'Wandsworth', 'Westminster'
];

const CATEGORY_KEYWORDS = [
  'soft play',
  'leisure centre',
  'community hall',
  'museum',
  'library'
];

const MAX_SEARCHES_PER_RUN = 20; // ~600 searches/month if run daily — stays within free tier

/**
 *
 * For under-represented boroughs, search Google Places via Text Search
 * to discover new venues not yet in the database.
 */
export async function discoverVenuesViaGooglePlaces(batchSize: number = 50): Promise<GooglePlacesDiscoveryResult> {
  const result: GooglePlacesDiscoveryResult = { discovered: 0, skipped: 0, failed: 0, totalProcessed: 0 };
  let searchCount = 0;

  if (!env.GOOGLE_PLACES_API_KEY) {
    logger.warn('Google Places discovery skipped: GOOGLE_PLACES_API_KEY not configured.');
    return result;
  }

  try {
    // Identify under-represented boroughs by venue count
    const { rows: boroughCounts } = await db.query(
      `SELECT COALESCE(borough, 'unknown') as borough, COUNT(*)::int as cnt
       FROM venues
       WHERE is_active = TRUE
         AND venue_scope = 'core'
       GROUP BY borough
       ORDER BY cnt ASC`
    );

    const boroughMap = new Map<string, number>(
      boroughCounts.map((r: any) => [r.borough, r.cnt])
    );

    // Sort boroughs by venue count ascending and take the bottom half
    const targetBoroughs = LONDON_BOROUGHS
      .filter(b => (boroughMap.get(b) || 0) < 100) // less than 100 venues = target
      .sort((a, b) => (boroughMap.get(a) || 0) - (boroughMap.get(b) || 0));

    if (targetBoroughs.length === 0) {
      logger.info('All boroughs have sufficient venue coverage. Skipping discovery.');
      return result;
    }

    logger.info({ targetBoroughs, count: targetBoroughs.length }, 'Targeting under-represented boroughs for Google Places discovery');

    // Borough centroid coordinates for location bias
    const boroughCentroids: Record<string, { lat: number; lon: number }> = {
      'Barking and Dagenham': { lat: 51.536, lon: 0.081 },
      'Barnet': { lat: 51.625, lon: -0.205 },
      'Bexley': { lat: 51.455, lon: 0.148 },
      'Brent': { lat: 51.543, lon: -0.274 },
      'Bromley': { lat: 51.406, lon: 0.015 },
      'Camden': { lat: 51.545, lon: -0.146 },
      'City of London': { lat: 51.515, lon: -0.092 },
      'Croydon': { lat: 51.372, lon: -0.109 },
      'Ealing': { lat: 51.513, lon: -0.309 },
      'Enfield': { lat: 51.652, lon: -0.082 },
      'Greenwich': { lat: 51.483, lon: 0.019 },
      'Hackney': { lat: 51.545, lon: -0.055 },
      'Hammersmith and Fulham': { lat: 51.493, lon: -0.226 },
      'Haringey': { lat: 51.585, lon: -0.114 },
      'Harrow': { lat: 51.580, lon: -0.335 },
      'Havering': { lat: 51.577, lon: 0.213 },
      'Hillingdon': { lat: 51.544, lon: -0.477 },
      'Hounslow': { lat: 51.467, lon: -0.362 },
      'Islington': { lat: 51.546, lon: -0.108 },
      'Kensington and Chelsea': { lat: 51.501, lon: -0.194 },
      'Kingston upon Thames': { lat: 51.412, lon: -0.300 },
      'Lambeth': { lat: 51.457, lon: -0.121 },
      'Lewisham': { lat: 51.441, lon: -0.019 },
      'Merton': { lat: 51.409, lon: -0.193 },
      'Newham': { lat: 51.526, lon: 0.024 },
      'Redbridge': { lat: 51.559, lon: 0.074 },
      'Richmond upon Thames': { lat: 51.447, lon: -0.327 },
      'Southwark': { lat: 51.503, lon: -0.081 },
      'Sutton': { lat: 51.362, lon: -0.195 },
      'Tower Hamlets': { lat: 51.520, lon: -0.039 },
      'Waltham Forest': { lat: 51.590, lon: -0.013 },
      'Wandsworth': { lat: 51.457, lon: -0.190 },
      'Westminster': { lat: 51.497, lon: -0.137 }
    };

    for (const borough of targetBoroughs) {
      if (result.discovered >= batchSize || searchCount >= MAX_SEARCHES_PER_RUN) break;
      const centroid = boroughCentroids[borough] || { lat: 51.5074, lon: -0.1278 };

      for (const keyword of CATEGORY_KEYWORDS) {
        if (result.discovered >= batchSize || searchCount >= MAX_SEARCHES_PER_RUN) break;
        // Rate limit between calls
        await new Promise((resolve) => setTimeout(resolve, 500));

        const searchQuery = `${keyword} in ${borough}, London`;

        try {
          searchCount++;
          const matches = await googlePlacesService.textSearch(searchQuery, {
            maxResults: 10,
            locationBias: { lat: centroid.lat, lon: centroid.lon },
            radius: 15000 // 15km within borough
          });

          if (matches.length === 0) {
            logger.info(`  No Google Places results for "${searchQuery}"`);
            continue;
          }

          logger.info({ borough, keyword, count: matches.length }, `Found ${matches.length} results for "${searchQuery}"`);

          for (const match of matches) {
            if (result.discovered >= batchSize) break;
            result.totalProcessed++;

            try {
              // Check if this venue already exists by source+source_id
              const { rows: existing } = await db.query(
                `SELECT id FROM venues WHERE source = 'google' AND source_id = $1 LIMIT 1`,
                [match.placeId]
              );

              if (existing.length > 0) {
                result.skipped++;
                continue;
              }

              // Check for duplicates by name proximity
              const { rows: nearDup } = await db.query(
                `SELECT id FROM venues
                 WHERE is_active = TRUE
                   AND name ILIKE $1
                   AND (
                     (lat IS NOT NULL AND lon IS NOT NULL
                      AND $2::numeric IS NOT NULL AND $3::numeric IS NOT NULL
                      AND ST_DWithin(
                        ST_SetSRID(ST_MakePoint(lon::numeric, lat::numeric), 4326),
                        ST_SetSRID(ST_MakePoint($3, $2), 4326),
                        100
                      ))
                     OR (borough = $4 AND name ILIKE $1)
                   )
                 LIMIT 1`,
                [`%${match.name}%`, match.lat, match.lon, borough]
              );

              if (nearDup.length > 0) {
                result.skipped++;
                continue;
              }

              const slug = `${match.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-')}-google-${match.placeId}`;

              await db.query(
                `INSERT INTO venues (
                  source, source_id, name, lat, lon, slug, website, phone,
                  address, borough, type, last_scraped, is_active,
                  google_places_enriched_at, enriched_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), TRUE, NOW(), NOW())
                ON CONFLICT (source, source_id) DO UPDATE SET
                  name = EXCLUDED.name,
                  lat = EXCLUDED.lat,
                  lon = EXCLUDED.lon,
                  website = COALESCE(NULLIF(EXCLUDED.website, ''), venues.website),
                  phone = COALESCE(NULLIF(EXCLUDED.phone, ''), venues.phone),
                  address = COALESCE(NULLIF(EXCLUDED.address, ''), venues.address),
                  last_scraped = NOW()
                RETURNING id`,
                [
                  'google',
                  match.placeId,
                  match.name,
                  match.lat ?? null,
                  match.lon ?? null,
                  slug,
                  match.website || null,
                  match.phone || null,
                  match.address || null,
                  borough,
                  'unknown'
                ]
              );

              result.discovered++;
              logger.info(`  ✓ Discovered "${match.name}" in ${borough}`);
            } catch (err: any) {
              logger.error({ err, name: match.name }, 'Error inserting discovered venue');
              result.failed++;
            }
          }
        } catch (err: any) {
          logger.error({ err, borough, keyword }, `Error searching Google Places for "${searchQuery}"`);
          result.failed++;
        }
      }
    }
  } catch (err: any) {
    logger.error({ err }, 'Google Places discovery pipeline error');
    throw err;
  }

  logger.info({ ...result, searchCount }, 'Google Places discovery batch completed.');
  return result;
}

// Allow running directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = process.argv.slice(2);
  const batchSizeIndex = args.indexOf('--batch-size');
  const batchSize = batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1], 10) || 50 : 50;
  discoverVenuesViaGooglePlaces(batchSize)
    .then((res) => {
      logger.info(res, 'Discovery complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Discovery failed');
      process.exit(1);
    });
}
