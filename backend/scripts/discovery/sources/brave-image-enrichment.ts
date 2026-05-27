import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { braveService } from '../../../src/services/braveService.js';

export interface BraveImageEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Brave Image Enrichment (Layer 3.7)
 * Fallback for venues that don't have images after Apify runs.
 */
export async function enrichViaBraveImages(limit: number = 20): Promise<BraveImageEnrichmentResult> {
  const result: BraveImageEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  try {
    // Find active venues missing images, prioritized by kid_score
    const { rows: venues } = await db.query(
      `SELECT id, name, borough, postcode 
       FROM venues 
       WHERE is_active = TRUE 
       AND (images IS NULL OR array_length(images, 1) IS NULL OR array_length(images, 1) = 0)
       ORDER BY kid_score DESC NULLS LAST, id ASC
       LIMIT $1`,
      [limit]
    );

    if (venues.length === 0) {
      logger.info('No venues require Brave image enrichment.');
      return result;
    }

    logger.info(`Brave Images: ${venues.length} venues to process.`);

    for (const venue of venues) {
      result.totalProcessed++;
      
      const searchQuery = `${venue.name} ${venue.borough || ''} ${venue.postcode || ''} London UK`;
      logger.info({ venueId: venue.id, name: venue.name, query: searchQuery }, 'Searching Brave for images...');

      const images = await braveService.searchImages(searchQuery, 3);

      if (images.length > 0) {
        await db.query(
          `UPDATE venues SET images = $1, enriched_at = NOW() WHERE id = $2`,
          [images, venue.id]
        );
        logger.info(`  ✓ Found ${images.length} images for "${venue.name}"`);
        result.enriched++;
      } else {
        logger.info(`  ✗ No images found for "${venue.name}"`);
        result.skipped++;
      }

      // Small delay between venues to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error: any) {
    logger.error({ err: error.message }, 'Brave image enrichment pipeline error');
    throw error;
  }

  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  enrichViaBraveImages(10)
    .then(res => {
      logger.info(res, 'Brave image enrichment complete');
      process.exit(0);
    })
    .catch(err => {
      logger.error(err);
      process.exit(1);
    });
}
