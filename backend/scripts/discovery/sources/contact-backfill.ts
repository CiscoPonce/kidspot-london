import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { normalizeUkPhone } from '../../../src/utils/phone.js';
import { enrichViaDirectCrawl } from './direct-crawl-enrichment.js';

/**
 * Contact Backfill pass (Layer 3.8)
 * 1. Normalize all existing phone numbers.
 * 2. Run targeted direct crawl for missing emails.
 */
export async function runContactBackfill(batchSize: number = 100) {
  logger.info('Starting Contact Backfill pass...');
  const stats = { normalized: 0, enriched: 0, failed: 0 };

  // 1. Phone Normalization
  try {
    const { rows: phoneVenues } = await db.query(
      `SELECT id, phone FROM venues 
       WHERE phone IS NOT NULL AND phone != '' 
       AND phone !~ '^0[0-9]{9,11}$' -- Not already normalized
       LIMIT $1`,
      [batchSize * 2]
    );

    for (const v of phoneVenues) {
      const normalized = normalizeUkPhone(v.phone);
      if (normalized && normalized !== v.phone) {
        await db.query(`UPDATE venues SET phone = $1 WHERE id = $2`, [normalized, v.id]);
        stats.normalized++;
      }
    }
    logger.info(`Normalized ${stats.normalized} phone numbers.`);
  } catch (err) {
    logger.error({ err }, 'Phone normalization pass failed');
    stats.failed++;
  }

  // 2. Targeted Direct Crawl (priority for missing emails)
  try {
    logger.info('Running targeted direct crawl for missing emails...');
    const result = await enrichViaDirectCrawl(batchSize);
    stats.enriched = result.enriched;
    logger.info(result, 'Targeted direct crawl complete');
  } catch (err) {
    logger.error({ err }, 'Targeted direct crawl failed');
    stats.failed++;
  }

  logger.info('Contact Backfill pass complete.');
  return stats;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runContactBackfill(20)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
