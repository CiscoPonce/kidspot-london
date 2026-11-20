import { fileURLToPath } from 'node:url';
import { db } from '../src/clients/db.js';
import { logger } from '../src/config/logger.js';
import { cleanAndRankImages } from '../src/utils/imageFilter.js';

export interface ImageCleanupResult {
  scanned: number;
  cleared: number;
  reorderedOrTrimmed: number;
  unchanged: number;
  dryRun: boolean;
}

/** Strips logos/placeholders and demotes banners across all active unlocked venues with images. */
export async function cleanupSuspectImages(dryRun = false): Promise<ImageCleanupResult> {
  const result: ImageCleanupResult = {
    scanned: 0,
    cleared: 0,
    reorderedOrTrimmed: 0,
    unchanged: 0,
    dryRun,
  };

  const { rows } = await db.query(
    `SELECT id, name, images
     FROM venues
     WHERE is_active = TRUE
       AND editor_locked = FALSE
       AND array_length(images, 1) > 0
     ORDER BY id ASC`,
  );

  for (const row of rows as Array<{ id: number; name: string; images: string[] }>) {
    result.scanned++;
    const orig = Array.isArray(row.images) ? row.images : [];
    const cleaned = cleanAndRankImages(orig);

    const isSame = cleaned.length === orig.length && cleaned.every((u, i) => u === orig[i]);
    if (isSame) {
      result.unchanged++;
      continue;
    }

    if (cleaned.length === 0) {
      if (!dryRun) {
        await db.query(
          `UPDATE venues
           SET images = NULL,
               website_images_attempted_at = NULL,
               brave_images_attempted_at = NULL,
               updated_at = NOW()
           WHERE id = $1 AND editor_locked = FALSE`,
          [row.id],
        );
      }
      result.cleared++;
    } else {
      if (!dryRun) {
        await db.query(
          `UPDATE venues
           SET images = $1,
               updated_at = NOW()
           WHERE id = $2 AND editor_locked = FALSE`,
          [cleaned, row.id],
        );
      }
      result.reorderedOrTrimmed++;
    }
  }

  logger.info(result, 'Suspect image cleanup complete');
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes('--dry-run');
  cleanupSuspectImages(dryRun)
    .then((res) => {
      console.log(JSON.stringify(res));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
