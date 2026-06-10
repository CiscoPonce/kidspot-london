import { db } from '../../../src/clients/db.js';
import { googlePlacesService } from '../../../src/services/googlePlacesService.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';

export interface GooglePlacesEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Google Places enrichment pipeline
 *
 * For venues missing website or phone:
 * 1. Match venue by name + lat/lon via Google Places API
 * 2. Update PostgreSQL with website/phone
 */
export async function enrichViaGooglePlaces(batchSize: number = 50): Promise<GooglePlacesEnrichmentResult> {
  const result: GooglePlacesEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  if (!env.GOOGLE_PLACES_API_KEY) {
    logger.warn('Google Places enrichment skipped: GOOGLE_PLACES_API_KEY not configured.');
    return result;
  }

  try {
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon, website, phone
       FROM venues
       WHERE is_active = TRUE
         AND venue_scope = 'core'
         AND lat IS NOT NULL AND lon IS NOT NULL
         AND (
           (phone IS NULL OR phone = '')
           OR (website IS NULL OR website = '')
         )
         AND (google_places_enriched_at IS NULL OR google_places_enriched_at < NOW() - INTERVAL '30 days')
       ORDER BY id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (venues.length === 0) {
      logger.info('No venues require Google Places enrichment.');
      return result;
    }

    logger.info(`Found ${venues.length} venues to enrich via Google Places...`);

    for (const venue of venues) {
      result.totalProcessed++;

      try {
        // Polite rate limit (Places API is fast, but let's be nice)
        await new Promise((resolve) => setTimeout(resolve, 500));

        const lat = parseFloat(venue.lat);
        const lon = parseFloat(venue.lon);

        const match = await googlePlacesService.findPlace(venue.name, lat, lon);

        if (!match) {
          await db.query(
            `UPDATE venues SET google_places_enriched_at = NOW() WHERE id = $1`,
            [venue.id]
          );
          result.skipped++;
          logger.info(`  ✗ No Google Places match for "${venue.name}"`);
          continue;
        }

        const phone = match.phone?.trim() || null;
        const website = match.website?.trim() || null;
        
        // If it was OPERATIONAL, but now CLOSED, we could update is_active.
        // For now, we just gather contacts.

        const hasNewData = Boolean((phone && !venue.phone) || (website && !venue.website));

        await db.query(
          `UPDATE venues SET
             website = COALESCE(NULLIF($1, ''), website),
             phone = COALESCE(NULLIF($2, ''), phone),
             google_place_id = COALESCE($3, google_place_id),
             google_places_enriched_at = NOW(),
             enriched_at = NOW(),
             last_scraped = NOW()
           WHERE id = $4`,
          [website, phone, match.placeId, venue.id]
        );

        if (hasNewData) {
          logger.info(
            `  ✓ Enriched "${venue.name}": ph=${!!phone} web=${!!website}`
          );
          result.enriched++;
        } else {
          logger.info(`  ~ Matched "${venue.name}" but no new contact data`);
          result.skipped++;
        }
      } catch (err: any) {
        logger.error({ err, venueId: venue.id, name: venue.name }, 'Error enriching venue via Google Places');
        result.failed++;
      }
    }
  } catch (err: any) {
    logger.error({ err }, 'Google Places enrichment pipeline error');
    throw err;
  }

  logger.info(result, 'Google Places enrichment batch completed.');
  return result;
}

// Allow running directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  enrichViaGooglePlaces(10)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
