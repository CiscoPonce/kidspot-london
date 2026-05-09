import { fetchSchoolLettings } from './sources/school-lettings.js';
import { fetchChurchHalls } from './sources/church-halls.js';
import { db } from '../../src/clients/db.js';

function generateSlug(name: string, sourceId: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sourceId}`;
}

export async function processVenueExpansion(isDryRun: boolean = false) {
  console.log(`Starting Venue Expansion Pipeline${isDryRun ? ' (DRY RUN)' : ''}...`);

  try {
    // 1. Fetch School Lettings
    console.log('\n--- 1. Fetching School Lettings ---');
    const schools = await fetchSchoolLettings();
    console.log(`Found ${schools.length} school venues.`);
    if (isDryRun && schools.length > 0) console.dir(schools[0]);

    // 2. Fetch Church & Parish Halls
    console.log('\n--- 2. Fetching Church & Parish Halls ---');
    const churches = await fetchChurchHalls();
    console.log(`Found ${churches.length} church/parish halls.`);
    if (isDryRun && churches.length > 0) console.dir(churches[0]);

    const totalFound = schools.length + churches.length;
    console.log(`\nTotal Venues Discovered: ${totalFound}`);

    if (isDryRun) {
      console.log('\nDry run complete. No database writes performed.');
      return { success: true, totalFound, dryRun: true, sources: { schools: schools.length, churches: churches.length } };
    }

    console.log('\nInitiating Database Ingestion...');

    let inserted = 0;
    const allVenues = [...schools, ...churches];

    for (const venue of allVenues) {
      try {
        const slug = generateSlug(venue.name, venue.id || Math.random().toString(36).substring(7));
        const venueType = venue.type || 'community_hall';

        await db.query(
          `INSERT INTO venues (source, source_id, name, type, lat, lon, slug, address, postcode, last_scraped, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), TRUE)
           ON CONFLICT (source, source_id) DO UPDATE SET
             name = EXCLUDED.name, type = EXCLUDED.type, lat = EXCLUDED.lat, lon = EXCLUDED.lon,
             address = COALESCE(NULLIF(EXCLUDED.address, ''), venues.address),
             postcode = COALESCE(NULLIF(EXCLUDED.postcode, ''), venues.postcode),
             last_scraped = NOW()`,
          [venue.source, venue.id, venue.name, venueType, venue.lat || 0, venue.lon || 0, slug, venue.address || '', venue.postcode || '']
        );
        inserted++;
      } catch (err: any) {
        console.error(`Failed to insert venue ${venue.name}:`, err.message);
      }
    }

    console.log(`\nSuccessfully ingested ${inserted} venues into the database.`);

    return {
      success: true,
      totalFound,
      inserted,
      dryRun: false,
      sources: { schools: schools.length, churches: churches.length },
    };
  } catch (error) {
    console.error('Pipeline failed:', error);
    throw error;
  }
}

// Allow running from command line directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  processVenueExpansion(args.includes('--dry-run'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
