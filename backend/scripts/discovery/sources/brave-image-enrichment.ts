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
    // Find active venues missing images, prioritizing party_capable and core venues first
    const { rows: venues } = await db.query(
      `SELECT id, name, borough, postcode 
       FROM venues 
       WHERE is_active = TRUE 
       AND (images IS NULL OR array_length(images, 1) IS NULL OR array_length(images, 1) = 0)
       AND (brave_images_attempted_at IS NULL OR brave_images_attempted_at < NOW() - INTERVAL '30 days')
       ORDER BY brave_images_attempted_at ASC NULLS FIRST,
                (CASE WHEN party_capable = TRUE THEN 0 WHEN venue_scope = 'core' THEN 1 ELSE 2 END),
                kid_score DESC NULLS LAST,
                id ASC
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

      let images: string[];
      try {
        images = await braveService.searchImages(searchQuery, 3);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (/429|rate limit/i.test(msg)) {
          logger.warn({ venueId: venue.id, err: msg }, 'Brave Search rate limit reached — stopping batch early');
          result.failed++;
          break;
        }
        result.failed++;
        continue;
      }

      if (images.length > 0) {
        await db.query(
          `UPDATE venues SET images = $1, brave_images_attempted_at = NOW(), enriched_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [images, venue.id]
        );
        logger.info(`  ✓ Found ${images.length} images for "${venue.name}"`);
        result.enriched++;
      } else {
        await db.query(
          `UPDATE venues SET brave_images_attempted_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [venue.id]
        );
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
  const argLimit = process.argv[2] ? Number.parseInt(process.argv[2], 10) : NaN;
  const limit = Number.isFinite(argLimit) && argLimit > 0 ? argLimit : 20;
  enrichViaBraveImages(limit)
    .then(res => {
      logger.info(res, 'Brave image enrichment complete');
      process.exit(0);
    })
    .catch(err => {
      logger.error(err);
      process.exit(1);
    });
}
