/**
 * Check party-eligible OSM venues against Overpass.
 * Marks live / gone. Does not delete rows.
 *
 *   npx tsx scripts/maintenance/verify-osm-liveness.ts [--limit 400] [--dry-run]
 */
import { db } from '../../src/clients/db.js';
import { fetchOverpassWithRetry } from '../discovery/sources/overpass-utils.js';
import { partyEligibilitySql } from '../../src/services/searchVisibility.js';

const SUB_BATCH = 40;
const PAUSE_MS = 2500;

function parseOsmId(sourceId: string | null): string | null {
  if (!sourceId) return null;
  const match = String(sourceId).match(/(\d{3,})$/);
  return match ? match[1] : null;
}

function isDisused(tags: Record<string, string> | undefined): boolean {
  if (!tags) return false;
  const blob = Object.entries(tags)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
    .toLowerCase();
  return (
    'disused' in tags ||
    'abandoned' in tags ||
    tags.disused === 'yes' ||
    tags.abandoned === 'yes' ||
    Object.keys(tags).some((k) => k.startsWith('disused:') || k.startsWith('abandoned:')) ||
    /permanently closed|closed down/.test(blob)
  );
}

async function mark(
  venueId: number,
  status: 'live' | 'gone' | 'unknown',
  reason: string,
  dryRun: boolean
) {
  if (dryRun) return;
  await db.query(
    `UPDATE venues
     SET liveness_status = $2,
         liveness_checked_at = NOW(),
         liveness_reason = $3,
         is_active = CASE WHEN $2 = 'gone' THEN FALSE ELSE is_active END
     WHERE id = $1`,
    [venueId, status, reason]
  );
  if (status === 'gone') {
    await db.query(`SELECT deactivate_venue($1, $2, $3)`, [
      venueId,
      'permanently_closed',
      reason,
    ]).catch(() => {
      /* deactivate_venue may already have set is_active */
    });
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((a) => a.startsWith('--limit'));
  const limit = limitArg ? Number(limitArg.split('=')[1] || process.argv[process.argv.indexOf('--limit') + 1]) : 800;

  const { rows } = await db.query(
    `SELECT id, name, source_id
     FROM venues
     WHERE is_active = TRUE
       AND source = 'osm'
       AND ${partyEligibilitySql()}
       AND (liveness_status IS NULL OR liveness_checked_at < NOW() - INTERVAL '30 days')
     ORDER BY
       CASE type WHEN 'softplay' THEN 1 WHEN 'community_hall' THEN 2 ELSE 3 END,
       id
     LIMIT $1`,
    [Number.isFinite(limit) ? limit : 800]
  );

  const result = { checked: 0, live: 0, gone: 0, unknown: 0, failed: 0, dryRun };

  console.log(`OSM liveness: ${rows.length} venues to check${dryRun ? ' (dry-run)' : ''}`);

  for (let i = 0; i < rows.length; i += SUB_BATCH) {
    const batch = rows.slice(i, i + SUB_BATCH);
    const idByOsm = new Map<string, typeof rows>();
    for (const venue of batch) {
      const osmId = parseOsmId(venue.source_id);
      if (!osmId) {
        await mark(venue.id, 'unknown', 'osm_id_unparsed', dryRun);
        result.unknown++;
        result.checked++;
        continue;
      }
      const list = idByOsm.get(osmId) || [];
      list.push(venue);
      idByOsm.set(osmId, list);
    }

    const osmIds = [...idByOsm.keys()];
    if (osmIds.length === 0) continue;

    if (i > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));

    try {
      const selectors = osmIds.map((id) => `node(${id});way(${id});relation(${id});`).join('');
      const query = `[out:json][timeout:45];(${selectors});out tags;`;
      const data = await fetchOverpassWithRetry(query);
      const elements = data?.elements || [];

      if (elements.length === 0 && osmIds.length > 8) {
        console.warn(`  Batch ${i / SUB_BATCH + 1}: empty Overpass response — skip (do not mark gone)`);
        result.failed += batch.length;
        continue;
      }

      const found = new Map<string, Record<string, string>>();
      for (const el of elements) {
        found.set(String(el.id), el.tags || {});
      }

      for (const osmId of osmIds) {
        const venues = idByOsm.get(osmId) || [];
        const tags = found.get(osmId);
        for (const venue of venues) {
          result.checked++;
          if (!tags) {
            await mark(venue.id, 'gone', 'osm_not_found', dryRun);
            result.gone++;
            console.log(`  gone  ${venue.name} (${osmId})`);
          } else if (isDisused(tags)) {
            await mark(venue.id, 'gone', 'osm_disused', dryRun);
            result.gone++;
            console.log(`  gone  ${venue.name} (${osmId}) disused`);
          } else {
            await mark(venue.id, 'live', 'osm_present', dryRun);
            result.live++;
          }
        }
      }
    } catch (err: any) {
      console.error(`  Overpass batch failed: ${err.message}`);
      result.failed += batch.length;
    }
  }

  // FHRS match in the last 4 years is a supporting "still trading" signal.
  if (!dryRun) {
    const fhrs = await db.query(
      `UPDATE venues
       SET liveness_status = 'live',
           liveness_checked_at = NOW(),
           liveness_reason = COALESCE(liveness_reason, 'fhrs_match')
       WHERE is_active = TRUE
         AND liveness_status IS DISTINCT FROM 'gone'
         AND fhrs_establishment_id IS NOT NULL
       RETURNING id`
    );
    console.log(`FHRS live marks: ${fhrs.rowCount || 0}`);
  }

  console.log(result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
