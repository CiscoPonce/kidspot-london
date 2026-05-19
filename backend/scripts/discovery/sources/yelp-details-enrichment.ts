import { db } from '../../../src/clients/db.js';
import { yelpService } from '../../../src/services/yelpService.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';

export interface YelpEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Yelp details enrichment pipeline (Layer 3.5)
 *
 * For active venues missing opening hours or images:
 * 1. Find Yelp match using name and lat/lon coordinates
 * 2. Fetch Yelp Business Details (hours, photos, rating, phone, website)
 * 3. Update PostgreSQL venues table directly
 *
 * Processes in batches to respect Yelp's free tier daily limits.
 */
export async function enrichViaYelpDetails(batchSize: number = 30): Promise<YelpEnrichmentResult> {
  const result: YelpEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  if (!env.YELP_API_KEY) {
    logger.warn('Yelp details enrichment skipped: YELP_API_KEY not configured.');
    return result;
  }

  try {
    // Select active venues that need enrichment
    // Prioritize softplay and leisure centres
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon, source, source_id, website, phone, images, opening_hours
       FROM venues
       WHERE is_active = TRUE
         AND (opening_hours IS NULL OR images IS NULL OR array_length(images, 1) = 0)
         AND type IN ('softplay', 'leisure_centre', 'community_hall', 'museum', 'library', 'park')
       ORDER BY
         CASE type
           WHEN 'softplay' THEN 1
           WHEN 'leisure_centre' THEN 2
           WHEN 'community_hall' THEN 3
           WHEN 'museum' THEN 4
           WHEN 'library' THEN 5
           ELSE 6
         END,
         id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (venues.length === 0) {
      logger.info('No active venues require details enrichment.');
      return result;
    }

    logger.info(`Found ${venues.length} venues to enrich via Yelp details...`);

    for (const venue of venues) {
      result.totalProcessed++;
      let yelpId = venue.source === 'yelp' ? venue.source_id : null;

      try {
        // Rate limit API calls (Yelp allows up to 5,000/day, so 1.5 seconds delay is extremely safe)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Find business match if not already a Yelp source
        if (!yelpId) {
          if (venue.lat && venue.lon) {
            const matches = await yelpService.searchBusinesses({
              term: venue.name,
              latitude: parseFloat(venue.lat),
              longitude: parseFloat(venue.lon),
              radius: 1000, // 1km tolerance for matching coordinates
              limit: 1
            });

            if (matches && matches.length > 0) {
              yelpId = matches[0].id;
              logger.info(`  ✓ Matched "${venue.name}" to Yelp ID: ${yelpId}`);
            }
          }
        }

        if (!yelpId) {
          // No Yelp business ID could be matched - mark as enriched so we don't loop infinitely
          await db.query(
            `UPDATE venues SET enriched_at = NOW(), last_scraped = NOW() WHERE id = $1`,
            [venue.id]
          );
          result.skipped++;
          logger.info(`  ✗ No Yelp match found for "${venue.name}"`);
          continue;
        }

        // Fetch rich business details
        const details = await yelpService.getBusinessDetails(yelpId);

        if (!details) {
          await db.query(
            `UPDATE venues SET enriched_at = NOW(), last_scraped = NOW() WHERE id = $1`,
            [venue.id]
          );
          result.skipped++;
          continue;
        }

        // Extract and format details
        const website = details.url || null;
        const phone = details.phone || details.display_phone || null;
        const rating = details.rating || null;
        const user_ratings_total = details.review_count || null;
        const openingHours = details.hours?.[0] ? JSON.stringify(details.hours[0]) : null;
        const imageUrls = details.photos && details.photos.length > 0
          ? details.photos
          : (details.image_url ? [details.image_url] : null);

        // Update database
        await db.query(
          `UPDATE venues SET
             website = COALESCE(NULLIF($1, ''), website),
             phone = COALESCE(NULLIF($2, ''), phone),
             rating = COALESCE($3, rating),
             user_ratings_total = COALESCE($4, user_ratings_total),
             opening_hours = COALESCE(NULLIF($5, ''), opening_hours),
             images = CASE WHEN $6::text[] IS NOT NULL AND (images IS NULL OR array_length(images, 1) = 0) THEN $6 ELSE images END,
             enriched_at = NOW(),
             last_scraped = NOW()
           WHERE id = $7`,
          [
            website,
            phone,
            rating,
            user_ratings_total,
            openingHours,
            imageUrls,
            venue.id
          ]
        );

        logger.info(`  ✓ Enriched "${venue.name}": hours=${!!openingHours} images=${imageUrls?.length || 0}`);
        result.enriched++;

      } catch (err: any) {
        logger.error({ err, venueId: venue.id, name: venue.name }, 'Error enriching venue details via Yelp');
        result.failed++;
      }
    }
  } catch (err: any) {
    logger.error({ err }, 'Yelp details enrichment pipeline error');
    throw err;
  }

  logger.info(result, 'Yelp Details Enrichment batch completed.');
  return result;
}

// Allow running directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  // Batch size 15 for quick manual testing/runs
  enrichViaYelpDetails(15)
    .then(() => {
      logger.info('Finished Yelp Details Enrichment run.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Fatal error in Yelp Details Enrichment run.');
      process.exit(1);
    });
}
