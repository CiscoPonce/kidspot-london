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
 */
export async function runDedupSweep(dryRun: boolean = false): Promise<DedupResult> {
  const result: DedupResult = { groupsFound: 0, venuesMerged: 0, venuesDeactivated: 0 };

  try {
    // Find duplicate groups: same name, within 200 meters
    const { rows: dupeGroups } = await db.query(`
      SELECT
        a.name,
        array_agg(a.id ORDER BY
          -- Score: prefer venues with more data
          (CASE WHEN a.website IS NOT NULL AND a.website != '' THEN 4 ELSE 0 END) +
          (CASE WHEN a.phone IS NOT NULL AND a.phone != '' THEN 3 ELSE 0 END) +
          (CASE WHEN a.email IS NOT NULL AND a.email != '' THEN 2 ELSE 0 END) +
          (CASE WHEN a.address IS NOT NULL AND a.address != '' THEN 2 ELSE 0 END) +
          (CASE WHEN a.postcode IS NOT NULL AND a.postcode != '' THEN 1 ELSE 0 END) +
          (CASE WHEN a.borough IS NOT NULL AND a.borough != '' THEN 1 ELSE 0 END) +
          (CASE WHEN a.enriched_at IS NOT NULL THEN 1 ELSE 0 END)
          DESC, a.id ASC
        ) AS venue_ids,
        COUNT(*) AS cnt
      FROM venues a
      JOIN venues b ON a.name = b.name
        AND a.id < b.id
        AND a.is_active = TRUE
        AND b.is_active = TRUE
        AND ST_DWithin(
          ST_MakePoint(a.lon, a.lat)::geography,
          ST_MakePoint(b.lon, b.lat)::geography,
          200
        )
      WHERE a.is_active = TRUE
      GROUP BY a.name
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC
    `);

    console.log(`Found ${dupeGroups.length} duplicate groups.`);
    result.groupsFound = dupeGroups.length;

    for (const group of dupeGroups) {
      const ids: number[] = group.venue_ids;
      const keepId = ids[0]; // First in the array has the highest data score
      const deactivateIds = ids.slice(1);

      console.log(`  "${group.name}" (${ids.length} venues): keep #${keepId}, deactivate ${deactivateIds.join(', ')}`);

      if (!dryRun) {
        // Merge: copy any non-null fields from duplicates to the keeper
        for (const dupeId of deactivateIds) {
          await db.query(`
            UPDATE venues SET
              website = COALESCE(website, (SELECT website FROM venues WHERE id = $1)),
              phone = COALESCE(phone, (SELECT phone FROM venues WHERE id = $1)),
              email = COALESCE(email, (SELECT email FROM venues WHERE id = $1)),
              address = COALESCE(address, (SELECT address FROM venues WHERE id = $1)),
              postcode = COALESCE(postcode, (SELECT postcode FROM venues WHERE id = $1)),
              borough = COALESCE(borough, (SELECT borough FROM venues WHERE id = $1)),
              booking_url = COALESCE(booking_url, (SELECT booking_url FROM venues WHERE id = $1)),
              description = COALESCE(description, (SELECT description FROM venues WHERE id = $1))
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
