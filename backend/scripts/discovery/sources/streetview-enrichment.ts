import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';

export interface StreetViewEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Street View Image Enrichment (Phase 20 - Task 1.2)
 * Fallback for venues that don't have images. Generates an image using Google Street View API.
 */
export async function enrichViaStreetView(limit: number = 20): Promise<StreetViewEnrichmentResult> {
  const result: StreetViewEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  if (!env.GOOGLE_PLACES_API_KEY) {
    logger.warn('GOOGLE_PLACES_API_KEY is missing. Skipping Street View enrichment.');
    return result;
  }

  try {
    // Find active venues missing images that have coordinates
    const { rows: venues } = await db.query(
      `SELECT id, name, lat, lon 
       FROM venues 
       WHERE is_active = TRUE 
       AND lat IS NOT NULL 
       AND lon IS NOT NULL
       AND (images IS NULL OR array_length(images, 1) IS NULL OR array_length(images, 1) = 0)
       ORDER BY kid_score DESC NULLS LAST, id ASC
       LIMIT $1`,
      [limit]
    );

    if (venues.length === 0) {
      logger.info('No venues require Street View image enrichment.');
      return result;
    }

    logger.info(`Street View Images: ${venues.length} venues to process.`);

    for (const venue of venues) {
      result.totalProcessed++;
      
      const { lat, lon } = venue;
      
      try {
        // 1. Check metadata to ensure Street View exists
        const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lon}&key=${env.GOOGLE_PLACES_API_KEY}`;
        const metaResponse = await fetch(metadataUrl);
        
        if (!metaResponse.ok) {
          logger.warn(`Failed to fetch Street View metadata for venue ${venue.id}`);
          result.skipped++;
          continue;
        }

        const metaData = await metaResponse.json() as any;

        if (metaData.status === 'OK') {
          // 2. Generate actual image URL
          // Using return_error_code=true just to be safe, though metadata already checked it.
          const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lon}&return_error_code=true&key=${env.GOOGLE_PLACES_API_KEY}`;
          
          await db.query(
            `UPDATE venues SET images = $1, enriched_at = NOW() WHERE id = $2`,
            [[imageUrl], venue.id]
          );
          
          logger.info(`  ✓ Added Street View image for "${venue.name}"`);
          result.enriched++;
        } else {
          logger.info(`  ✗ No Street View available for "${venue.name}" (Status: ${metaData.status})`);
          result.skipped++;
        }
      } catch (venueError: any) {
        logger.error({ err: venueError.message, venueId: venue.id }, 'Error processing venue for Street View');
        result.failed++;
      }

      // Small delay between venues to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error: any) {
    logger.error({ err: error.message }, 'Street View enrichment pipeline error');
    throw error;
  }

  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  enrichViaStreetView(10)
    .then(res => {
      logger.info(res, 'Street View enrichment complete');
      process.exit(0);
    })
    .catch(err => {
      logger.error(err);
      process.exit(1);
    });
}
