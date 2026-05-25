import { db } from '../../../src/clients/db.js';
import { foursquareService } from '../../../src/services/foursquareService.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';

export interface FoursquareEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Foursquare enrichment pipeline (Layer 3.6)
 *
 * For high-value venues missing contact info or rich metadata:
 * 1. Match venue by name + lat/lon via Foursquare Place Search (free tier)
 * 2. Optionally fetch basic place details for tel/website/email
 * 3. Update PostgreSQL with COALESCE guards
 *
 * Note: hours, photos, and ratings require Foursquare premium credits.
 */
export async function enrichViaFoursquare(batchSize: number = 50): Promise<FoursquareEnrichmentResult> {
  const result: FoursquareEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  if (!env.FOURSQUARE_API_KEY) {
    logger.warn('Foursquare enrichment skipped: FOURSQUARE_API_KEY not configured.');
    return result;
  }

  try {
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon, website, phone, email
       FROM venues
       WHERE is_active = TRUE
         AND lat IS NOT NULL AND lon IS NOT NULL
         AND (
           (phone IS NULL OR phone = '')
           OR (website IS NULL OR website = '')
           OR (email IS NULL OR email = '')
         )
         AND type IN ('softplay', 'leisure_centre', 'community_hall', 'museum', 'library')
         AND (foursquare_enriched_at IS NULL OR foursquare_enriched_at < NOW() - INTERVAL '90 days')
       ORDER BY
         CASE type
           WHEN 'softplay' THEN 1
           WHEN 'leisure_centre' THEN 2
           WHEN 'community_hall' THEN 3
           WHEN 'museum' THEN 4
           WHEN 'library' THEN 5
         END,
         id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (venues.length === 0) {
      logger.info('No venues require Foursquare enrichment.');
      return result;
    }

    logger.info(`Found ${venues.length} venues to enrich via Foursquare...`);

    for (const venue of venues) {
      result.totalProcessed++;

      try {
        // Polite rate limit (~2 req/s)
        await new Promise((resolve) => setTimeout(resolve, 500));

        const lat = parseFloat(venue.lat);
        const lon = parseFloat(venue.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          result.skipped++;
          continue;
        }

        const match = await foursquareService.findBestMatch({
          name: venue.name,
          latitude: lat,
          longitude: lon,
        });

        if (!match) {
          await db.query(
            `UPDATE venues SET foursquare_enriched_at = NOW() WHERE id = $1`,
            [venue.id]
          );
          result.skipped++;
          logger.info(`  ✗ No Foursquare match for "${venue.name}"`);
          continue;
        }

        let place = match.place;

        // Fetch details if search result is missing contact fields
        if (!place.tel && !place.website && !place.email) {
          const details = await foursquareService.getPlaceDetails(place.fsq_place_id);
          if (details) place = { ...place, ...details };
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const phone = place.tel?.trim() || null;
        const website = place.website?.trim() || null;
        const email = place.email?.trim() || null;

        const hasNewData = Boolean(phone || website || email);

        await db.query(
          `UPDATE venues SET
             website = COALESCE(NULLIF($1, ''), website),
             phone = COALESCE(NULLIF($2, ''), phone),
             email = COALESCE(NULLIF($3, ''), email),
             foursquare_place_id = COALESCE($4, foursquare_place_id),
             foursquare_enriched_at = NOW(),
             enriched_at = NOW(),
             last_scraped = NOW()
           WHERE id = $5`,
          [website, phone, email, place.fsq_place_id, venue.id]
        );

        if (hasNewData) {
          logger.info(
            `  ✓ Enriched "${venue.name}" (score=${match.score.toFixed(2)}): ph=${!!phone} web=${!!website} em=${!!email}`
          );
          result.enriched++;
        } else {
          logger.info(`  ~ Matched "${venue.name}" but no new contact data`);
          result.skipped++;
        }
      } catch (err: any) {
        logger.error({ err, venueId: venue.id, name: venue.name }, 'Error enriching venue via Foursquare');
        result.failed++;
      }
    }
  } catch (err: any) {
    logger.error({ err }, 'Foursquare enrichment pipeline error');
    throw err;
  }

  logger.info(result, 'Foursquare enrichment batch completed.');
  return result;
}

// Allow running directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  enrichViaFoursquare(10)
    .then(() => {
      logger.info('Finished Foursquare enrichment run.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Fatal error in Foursquare enrichment run.');
      process.exit(1);
    });
}
