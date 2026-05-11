import { db } from '../../../src/clients/db.js';

export interface OsmContactResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * OSM Contact Enrichment Pipeline (Layer 1)
 *
 * Queries the Overpass API using stored source_id values to pull the full
 * tag set from OpenStreetMap. Extracts website, phone, email, opening_hours,
 * and description tags and writes them back to the venues table.
 *
 * Processes venues in batches of 50 to stay within Overpass rate limits.
 * Only targets named, active OSM venues that haven't been contact-enriched yet.
 */
export async function enrichOsmContacts(batchSize: number = 50): Promise<OsmContactResult> {
  const result: OsmContactResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  try {
    // Find OSM venues that need contact enrichment
    const { rows: venues } = await db.query(
      `SELECT id, name, source_id FROM venues
       WHERE is_active = TRUE
         AND source = 'osm'
         AND contact_enriched_at IS NULL
         AND name !~* '^OSM [0-9]+$'
       ORDER BY
         CASE type
           WHEN 'softplay' THEN 1
           WHEN 'leisure_centre' THEN 2
           WHEN 'museum' THEN 3
           WHEN 'library' THEN 4
           WHEN 'cafe' THEN 5
           WHEN 'community_hall' THEN 6
           ELSE 7
         END,
         id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (venues.length === 0) {
      console.log('No OSM venues left to enrich.');
      return result;
    }

    console.log(`Found ${venues.length} OSM venues to enrich via Overpass.`);

    // Process in sub-batches of 50 IDs per Overpass query
    const SUB_BATCH = 50;
    for (let i = 0; i < venues.length; i += SUB_BATCH) {
      const batch = venues.slice(i, i + SUB_BATCH);
      const osmIds = batch.map(v => v.source_id);

      try {
        // Rate limit: wait 2 seconds between Overpass requests
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Build multi-ID Overpass query
        const idSelectors = osmIds.map(id =>
          `node(${id});way(${id});relation(${id});`
        ).join('');

        const query = `[out:json][timeout:30];(${idSelectors});out tags;`;

        console.log(`  Querying Overpass for batch ${Math.floor(i / SUB_BATCH) + 1} (${batch.length} venues)...`);

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'KidSpot-London/1.0 (osm-contact-enrichment)'
          },
          body: 'data=' + encodeURIComponent(query)
        });

        if (!response.ok) {
          console.warn(`  Overpass returned ${response.status} — skipping batch.`);
          result.failed += batch.length;
          continue;
        }

        const data = await response.json() as any;
        const elements = data?.elements || [];

        // Build a lookup map: OSM ID → tags
        const tagMap = new Map<string, Record<string, string>>();
        for (const el of elements) {
          tagMap.set(String(el.id), el.tags || {});
        }

        // Update each venue with extracted tags
        for (const venue of batch) {
          result.totalProcessed++;
          const tags = tagMap.get(venue.source_id);

          if (!tags) {
            // Venue not found in Overpass response — mark as processed anyway
            await db.query(
              `UPDATE venues SET contact_enriched_at = NOW() WHERE id = $1`,
              [venue.id]
            );
            result.skipped++;
            continue;
          }

          // Extract contact info from OSM tags
          const website = tags.website || tags['contact:website'] || tags.url || null;
          const phone = tags.phone || tags['contact:phone'] || null;
          const email = tags.email || tags['contact:email'] || null;
          const openingHours = tags.opening_hours || null;
          const description = tags.description || tags.note || null;

          // Also try to get a better name if we somehow still have a generic one
          const osmName = tags.name || null;

          const hasNewData = website || phone || email || openingHours || description;

          if (hasNewData) {
            await db.query(
              `UPDATE venues SET
                 website = COALESCE(NULLIF($1, ''), website),
                 phone = COALESCE(NULLIF($2, ''), phone),
                 email = COALESCE(NULLIF($3, ''), email),
                 opening_hours = COALESCE(NULLIF($4, ''), opening_hours),
                 description = COALESCE(NULLIF($5, ''), description),
                 name = COALESCE(NULLIF($6, ''), name),
                 contact_enriched_at = NOW()
               WHERE id = $7`,
              [website, phone, email, openingHours, description, osmName, venue.id]
            );
            console.log(`  ✓ ${venue.name}: web=${!!website} ph=${!!phone} em=${!!email} hrs=${!!openingHours}`);
            result.enriched++;
          } else {
            await db.query(
              `UPDATE venues SET contact_enriched_at = NOW() WHERE id = $1`,
              [venue.id]
            );
            result.skipped++;
          }
        }
      } catch (err: any) {
        console.error(`  Overpass batch error:`, err.message);
        result.failed += batch.length;
      }
    }
  } catch (err: any) {
    console.error('OSM contact enrichment pipeline error:', err.message);
    throw err;
  }

  return result;
}
