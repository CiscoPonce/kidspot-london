import { db } from '../../src/clients/db.js';

export interface DedupResult {
  groupsFound: number;
  venuesMerged: number;
  venuesDeactivated: number;
}

/**
 * Deduplication Sweep
 *
 * Finds venues with the same name within 200m of each other and merges them.
 * Keeps the venue with the most enriched data, deactivates the rest.
 * Uses levenshtein distance <= 2 to catch slight name variations (e.g. typos).
 * Uses NULLIF guards throughout to prevent empty strings from overwriting valid data.
 */
export async function runDedupSweep(dryRun: boolean = false): Promise<DedupResult> {
  const result: DedupResult = { groupsFound: 0, venuesMerged: 0, venuesDeactivated: 0 };

  try {
    // Find duplicate pairs: same name (or levenshtein <= 2), within 200 meters
    const { rows: dupeGroups } = await db.query(`
      WITH pairs AS (
        SELECT a.name as group_name, a.id as a_id, b.id as b_id
        FROM venues a
        JOIN venues b ON 
          (a.name = b.name OR levenshtein(lower(a.name), lower(b.name)) <= 2)
          AND a.id < b.id
          AND a.is_active = TRUE
          AND b.is_active = TRUE
          AND ST_DWithin(
            ST_MakePoint(a.lon, a.lat)::geography,
            ST_MakePoint(b.lon, b.lat)::geography,
            200
          )
      ),
      all_ids AS (
        SELECT group_name, a_id as id FROM pairs
        UNION
        SELECT group_name, b_id as id FROM pairs
      )
      SELECT
        group_name as name,
        array_agg(id ORDER BY
          (SELECT 
            (CASE WHEN website IS NOT NULL AND website != '' THEN 4 ELSE 0 END) +
            (CASE WHEN phone IS NOT NULL AND phone != '' THEN 3 ELSE 0 END) +
            (CASE WHEN email IS NOT NULL AND email != '' THEN 2 ELSE 0 END) +
            (CASE WHEN address IS NOT NULL AND address != '' THEN 2 ELSE 0 END) +
            (CASE WHEN postcode IS NOT NULL AND postcode != '' THEN 1 ELSE 0 END) +
            (CASE WHEN borough IS NOT NULL AND borough != '' THEN 1 ELSE 0 END) +
            (CASE WHEN enriched_at IS NOT NULL THEN 1 ELSE 0 END)
           FROM venues WHERE venues.id = all_ids.id) DESC, id ASC
        ) AS venue_ids,
        COUNT(*) AS cnt
      FROM all_ids
      GROUP BY group_name
    `);

    console.log(`Found ${dupeGroups.length} duplicate groups.`);
    result.groupsFound = dupeGroups.length;

    for (const group of dupeGroups) {
      const ids: number[] = group.venue_ids;
      const keepId = ids[0]; // First in the array has the highest data score
      const deactivateIds = ids.slice(1);

      if (deactivateIds.length === 0) continue;

      console.log(`  "${group.name}" (${ids.length} venues): keep #${keepId}, deactivate ${deactivateIds.join(', ')}`);

      if (!dryRun) {
        // Merge: copy any non-null, non-empty fields from duplicates to the keeper
        for (const dupeId of deactivateIds) {
          await db.query(`
            UPDATE venues SET
              website = COALESCE(NULLIF(website, ''), (SELECT NULLIF(website, '') FROM venues WHERE id = $1)),
              phone = COALESCE(NULLIF(phone, ''), (SELECT NULLIF(phone, '') FROM venues WHERE id = $1)),
              email = COALESCE(NULLIF(email, ''), (SELECT NULLIF(email, '') FROM venues WHERE id = $1)),
              address = COALESCE(NULLIF(address, ''), (SELECT NULLIF(address, '') FROM venues WHERE id = $1)),
              postcode = COALESCE(NULLIF(postcode, ''), (SELECT NULLIF(postcode, '') FROM venues WHERE id = $1)),
              borough = COALESCE(NULLIF(borough, ''), (SELECT NULLIF(borough, '') FROM venues WHERE id = $1)),
              booking_url = COALESCE(NULLIF(booking_url, ''), (SELECT NULLIF(booking_url, '') FROM venues WHERE id = $1)),
              description = COALESCE(NULLIF(description, ''), (SELECT NULLIF(description, '') FROM venues WHERE id = $1)),
              opening_hours = COALESCE(NULLIF(opening_hours, ''), (SELECT NULLIF(opening_hours, '') FROM venues WHERE id = $1)),
              images = COALESCE(images, (SELECT images FROM venues WHERE id = $1))
            WHERE id = $2
          `, [dupeId, keepId]);
        }

        // Deactivate duplicates
        await db.query(
          `UPDATE venues SET is_active = FALSE WHERE id = ANY($1)`,
          [deactivateIds]
        );

        result.venuesDeactivated += deactivateIds.length;
      }

      result.venuesMerged++;
    }
  } catch (err: any) {
    console.error('Dedup sweep error:', err.message);
    throw err;
  }

  return result;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  console.log(`Running dedup sweep${dryRun ? ' (DRY RUN)' : ''}...`);
  runDedupSweep(dryRun)
    .then(r => {
      console.log(`\nDedup complete: ${r.groupsFound} groups, ${r.venuesMerged} merged, ${r.venuesDeactivated} deactivated.`);
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
