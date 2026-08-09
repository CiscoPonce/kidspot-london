import { db } from '../../src/clients/db.js';
import { logger } from '../../src/config/logger.js';

export async function cleanBadImages(): Promise<{ cleaned: number }> {
  let cleanedCount = 0;

  try {
    logger.info('Starting bad image cleanup...');

    // Fetch venues with images
    const { rows } = await db.query(
      `SELECT id, name, images FROM venues WHERE images IS NOT NULL AND array_length(images, 1) > 0`
    );

    for (const venue of rows) {
      const originalImages: string[] = venue.images || [];
      const filteredImages = originalImages.filter((imgUrl: string) => {
        if (!imgUrl || typeof imgUrl !== 'string') return false;
        const lower = imgUrl.toLowerCase();
        
        // Filter out bad patterns
        if (lower.includes('wikimedia.org') ||
            lower.includes('geograph.org.uk') ||
            lower.includes('maps.google.com/maps/api/staticmap') ||
            lower.includes('property-images-uk') ||
            lower.includes('rightmove.co.uk') ||
            lower.includes('where-e.com')) {
          return false;
        }

        // Filter out generic file names or placeholders
        if (lower.endsWith('.svg') || lower.endsWith('.ico')) return false;

        return true;
      });

      if (filteredImages.length !== originalImages.length) {
        await db.query(
          `UPDATE venues SET images = $1 WHERE id = $2`,
          [filteredImages.length > 0 ? filteredImages : null, venue.id]
        );
        cleanedCount++;
        logger.info(`Cleaned bad images for venue ${venue.id} ("${venue.name}"): kept ${filteredImages.length}/${originalImages.length}`);
      }
    }

    logger.info(`Bad image cleanup complete. Cleaned ${cleanedCount} venues.`);
  } catch (error: any) {
    logger.error({ err: error }, 'Error during bad image cleanup');
  }

  return { cleaned: cleanedCount };
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('clean-bad-images.ts') || process.argv[1]?.endsWith('clean-bad-images.js')) {
  cleanBadImages().then(({ cleaned }) => {
    console.log(`Cleaned ${cleaned} venues with bad images.`);
    process.exit(0);
  }).catch((err) => {
    console.error('Failed to clean bad images:', err);
    process.exit(1);
  });
}
