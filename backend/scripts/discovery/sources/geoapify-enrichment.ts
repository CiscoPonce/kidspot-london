import { db } from '../../../src/clients/db.js';
import { geoapifyService } from '../../../src/services/geoapifyService.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';

export interface GeoapifyEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Geoapify enrichment (Layer 3.7)
 * Matches existing venues to Geoapify/OSM POI data for website, email, phone.
 * Free tier: 3,000 credits/day (~60k places/day at 20 places/credit).
 */
export async function enrichViaGeoapify(batchSize: number = 40): Promise<GeoapifyEnrichmentResult> {
  const result: GeoapifyEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  if (!env.GEOAPIFY_API_KEY) {
    logger.warn('Geoapify enrichment skipped: GEOAPIFY_API_KEY not configured.');
    return result;
  }

  const { rows: venues } = await db.query(
    `SELECT id, name, type, lat, lon, website, phone, email, opening_hours
     FROM venues
     WHERE is_active = TRUE
       AND venue_scope = 'core'
       AND lat IS NOT NULL AND lon IS NOT NULL
       AND (
         (phone IS NULL OR phone = '')
         OR (website IS NULL OR website = '')
         OR (email IS NULL OR email = '')
       )
       AND type IN ('softplay', 'leisure_centre', 'community_hall', 'museum', 'library', 'park')
       AND (geoapify_enriched_at IS NULL OR geoapify_enriched_at < NOW() - INTERVAL '90 days')
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
    logger.info('No venues require Geoapify enrichment.');
    return result;
  }

  logger.info(`Geoapify: ${venues.length} venues to enrich.`);

  for (const venue of venues) {
    result.totalProcessed++;

    try {
      await new Promise((r) => setTimeout(r, 300));

      const match = await geoapifyService.findBestMatch({
        name: venue.name,
        latitude: parseFloat(venue.lat),
        longitude: parseFloat(venue.lon),
      });

      if (!match) {
        await db.query(`UPDATE venues SET geoapify_enriched_at = NOW() WHERE id = $1`, [venue.id]);
        result.skipped++;
        logger.info(`  ✗ No Geoapify match for "${venue.name}"`);
        continue;
      }

      const place = match.place;
      const website = place.website?.trim() || null;
      const phone = place.contact?.phone?.trim() || null;
      const email = place.contact?.email?.trim() || null;
      const openingHours = place.opening_hours?.trim() || null;

      const hasNew = Boolean(website || phone || email || openingHours);

      await db.query(
        `UPDATE venues SET
           website = COALESCE(NULLIF($1, ''), website),
           phone = COALESCE(NULLIF($2, ''), phone),
           email = COALESCE(NULLIF($3, ''), email),
           opening_hours = COALESCE(NULLIF($4, ''), opening_hours),
           geoapify_place_id = COALESCE($5, geoapify_place_id),
           geoapify_enriched_at = NOW(),
           enriched_at = NOW()
         WHERE id = $6`,
        [website, phone, email, openingHours, place.place_id, venue.id]
      );

      if (hasNew) {
        logger.info(`  ✓ ${venue.name} (score=${match.score.toFixed(2)}): web=${!!website} ph=${!!phone} em=${!!email}`);
        result.enriched++;
      } else {
        result.skipped++;
      }
    } catch (err: any) {
      logger.error({ err, venueId: venue.id }, 'Geoapify enrichment error');
      result.failed++;
    }
  }

  logger.info(result, 'Geoapify enrichment batch completed.');
  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  enrichViaGeoapify(10).then(() => process.exit(0)).catch(() => process.exit(1));
}
