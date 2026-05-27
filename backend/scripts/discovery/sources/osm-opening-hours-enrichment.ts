import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { fetchOverpassWithRetry } from './overpass-utils.js';

export interface OsmHoursResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * OSM Opening Hours Enrichment (Layer 1b)
 * Dedicated pass for OSM venues missing opening_hours tag.
 * Separate from contact enrichment so venues already contact-enriched get a second chance.
 */
export async function enrichOsmOpeningHours(batchSize: number = 100): Promise<OsmHoursResult> {
  const result: OsmHoursResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  const { rows: venues } = await db.query(
    `SELECT id, name, source_id FROM venues
     WHERE is_active = TRUE
       AND source = 'osm'
       AND source_id IS NOT NULL AND source_id != ''
       AND (opening_hours IS NULL OR opening_hours = '')
       AND name !~* '^OSM [0-9]+$'
       AND (osm_hours_enriched_at IS NULL OR osm_hours_enriched_at < NOW() - INTERVAL '180 days')
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
    logger.info('No OSM venues require opening hours enrichment.');
    return result;
  }

  logger.info(`OSM hours: ${venues.length} venues to query via Overpass.`);

  const SUB_BATCH = 50;
  for (let i = 0; i < venues.length; i += SUB_BATCH) {
    const batch = venues.slice(i, i + SUB_BATCH);
    const osmIds = batch.map((v) => v.source_id);

    try {
      if (i > 0) await new Promise((r) => setTimeout(r, 2000));

      const idSelectors = osmIds.map((id) => `node(${id});way(${id});relation(${id});`).join('');
      const query = `[out:json][timeout:30];(${idSelectors});out tags;`;

      const data = await fetchOverpassWithRetry(query);

      const tagMap = new Map<string, Record<string, string>>();
      for (const el of data?.elements || []) {
        tagMap.set(String(el.id), el.tags || {});
      }

      for (const venue of batch) {
        result.totalProcessed++;
        const tags = tagMap.get(venue.source_id);

        if (!tags) {
          await db.query(`UPDATE venues SET osm_hours_enriched_at = NOW() WHERE id = $1`, [venue.id]);
          result.skipped++;
          continue;
        }

        const openingHours =
          tags.opening_hours ||
          tags['opening_hours:covid19'] ||
          tags['opening_hours:kids'] ||
          null;

        if (openingHours) {
          await db.query(
            `UPDATE venues SET
               opening_hours = COALESCE(NULLIF($1, ''), opening_hours),
               osm_hours_enriched_at = NOW()
             WHERE id = $2`,
            [openingHours, venue.id]
          );
          logger.info(`  ✓ ${venue.name}: hours=${openingHours.slice(0, 40)}...`);
          result.enriched++;
        } else {
          await db.query(`UPDATE venues SET osm_hours_enriched_at = NOW() WHERE id = $1`, [venue.id]);
          result.skipped++;
        }
      }
    } catch (err: any) {
      logger.error({ err }, 'OSM hours Overpass batch error');
      result.failed += batch.length;
    }
  }

  logger.info(result, 'OSM opening hours batch completed.');
  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  enrichOsmOpeningHours(50).then(() => process.exit(0)).catch(() => process.exit(1));
}
