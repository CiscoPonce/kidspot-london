import { db } from '../../../src/clients/db.js';
import { fhrsService } from '../../../src/services/fhrsService.js';
import { logger } from '../../../src/config/logger.js';
import { crawlDelay } from '../../../src/utils/rateLimiter.js';

export interface FhrsBatchResult {
  matched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * FHRS batch matching pipeline
 *
 * For venues missing FHRS match:
 * 1. Query venues without fhrs_establishment_id
 * 2. Match each venue by name + postcode / location via FHRS API
 * 3. Upsert matched establishment into fhrs_establishments table
 * 4. Update venue with denormalized rating fields
 */
export async function batchMatchFhrs(batchSize: number = 50): Promise<FhrsBatchResult> {
  const result: FhrsBatchResult = { matched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  try {
    const { rows: venues } = await db.query(
      `SELECT id, name, postcode, lat, lon FROM venues
       WHERE is_active = TRUE
         AND venue_scope = 'core'
         AND fhrs_establishment_id IS NULL
         AND (fhrs_matched_at IS NULL OR fhrs_matched_at < NOW() - INTERVAL '90 days')
       ORDER BY id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (venues.length === 0) {
      logger.info('No venues require FHRS batch matching.');
      return result;
    }

    logger.info(`Found ${venues.length} venues to match via FHRS...`);

    for (const venue of venues) {
      result.totalProcessed++;

      try {
        // Polite rate limit (FHRS API free tier: 600 requests/min)
        await crawlDelay(600);

        const match = await fhrsService.matchFhrsToVenue({
          name: venue.name,
          postcode: venue.postcode,
          latitude: venue.lat ? parseFloat(venue.lat) : undefined,
          longitude: venue.lon ? parseFloat(venue.lon) : undefined,
        });

        if (match) {
          // Upsert into fhrs_establishments table
          await db.query(
            `INSERT INTO fhrs_establishments (id, business_name, business_type, postcode, rating_value, rating_date, lat, lon, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET
               rating_value = COALESCE(NULLIF(EXCLUDED.rating_value, ''), fhrs_establishments.rating_value),
               rating_date = COALESCE(NULLIF(EXCLUDED.rating_date::TEXT, '')::TIMESTAMPTZ, fhrs_establishments.rating_date),
               last_updated = NOW()`,
            [
              match.id,
              match.business_name,
              match.business_type,
              match.postcode,
              match.rating_value,
              match.rating_date,
              match.lat,
              match.lon,
            ]
          );

          // Update venues with denormalized values
          await db.query(
            `UPDATE venues SET
               fhrs_establishment_id = $1,
               fhrs_rating_value = COALESCE(NULLIF($2, ''), fhrs_rating_value),
               fhrs_rating_date = COALESCE($3::TIMESTAMPTZ, fhrs_rating_date),
               fhrs_matched_at = NOW(),
               enriched_at = NOW()
             WHERE id = $4`,
            [
              match.id,
              match.rating_value,
              match.rating_date,
              venue.id,
            ]
          );

          result.matched++;
          logger.info(`  ✓ Matched "${venue.name}" → FHRS ID ${match.id} (rating: ${match.rating_value})`);
        } else {
          // Mark as attempted — avoid re-processing until 90-day retry window
          await db.query(
            `UPDATE venues SET fhrs_matched_at = NOW() WHERE id = $1`,
            [venue.id]
          );
          result.skipped++;
          logger.info(`  ✗ No FHRS match for "${venue.name}"`);
        }
      } catch (err: any) {
        logger.error({ err, venueId: venue.id, name: venue.name }, 'Error matching venue via FHRS');
        result.failed++;
      }
    }
  } catch (err: any) {
    logger.error({ err }, 'FHRS batch matching pipeline error');
    throw err;
  }

  logger.info(result, 'FHRS batch matching batch completed.');
  return result;
}

// Allow running directly as CLI
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const batchSize = parseInt(process.argv[2] || '10', 10);
  batchMatchFhrs(batchSize)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
