import { fetchCouncilHalls } from './sources/council-halls.js';
import { fetchCharityHalls } from './sources/charity-halls.js';
import { fetchOSMPartyVenues } from './sources/osm-parties.js';
import { db } from '../../src/clients/db.js';

function generateSlug(name: string, sourceId: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sourceId}`;
}

export async function processPartyVenues(isDryRun: boolean = false) {

  console.log(`Starting Daily Party Venue Discovery Pipeline${isDryRun ? ' (DRY RUN)' : ''}...`);

  try {
    // 1. Fetch Council Halls
    console.log('\n--- 1. Fetching Council Halls ---');
    const councilHalls = await fetchCouncilHalls();
    console.log(`Found ${councilHalls.length} council halls.`);
    if (isDryRun && councilHalls.length > 0) console.dir(councilHalls[0]);

    // 2. Fetch Charity Halls
    console.log('\n--- 2. Fetching Charity Commission Halls ---');
    const charityHalls = await fetchCharityHalls();
    console.log(`Found ${charityHalls.length} charity halls.`);
    if (isDryRun && charityHalls.length > 0) console.dir(charityHalls[0]);

    // 3. Fetch OSM Party Venues
    console.log('\n--- 3. Fetching OSM Party Venues ---');
    const osmVenues = await fetchOSMPartyVenues();
    console.log(`Found ${osmVenues.length} OSM venues.`);
    if (isDryRun && osmVenues.length > 0) console.dir(osmVenues[0]);

    // 4. Ingest to Database
    const totalFound = councilHalls.length + charityHalls.length + osmVenues.length;
    console.log(`\nTotal Venues Discovered: ${totalFound}`);

    if (isDryRun) {
      console.log('\nDry run complete. No database writes performed.');
      process.exit(0);
    }

    console.log('\nInitiating Database Ingestion...');
    
    let inserted = 0;
    const allVenues = [
      ...councilHalls,
      ...charityHalls,
      ...osmVenues
    ];

    for (const venue of allVenues) {
      try {
        const slug = generateSlug(venue.name, venue.id || Math.random().toString(36).substring(7));
        const venueType = venue.type || 'party_venue';
        
        await db.query(
          `INSERT INTO venues (source, source_id, name, type, lat, lon, slug, last_scraped, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE)
           ON CONFLICT (source, source_id) DO UPDATE SET
             name = EXCLUDED.name, type = EXCLUDED.type, lat = EXCLUDED.lat, lon = EXCLUDED.lon, last_scraped = NOW()`,
          [venue.source, venue.id || 'unknown', venue.name, venueType, venue.lat || 0, venue.lon || 0, slug]
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
      dryRun: isDryRun,
      sources: { council: councilHalls.length, charity: charityHalls.length, osm: osmVenues.length }
    };

  } catch (error) {
    console.error('Pipeline failed:', error);
    throw error;
  }
}

// Allow running from command line directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  processPartyVenues(args.includes('--dry-run')).then(() => process.exit(0)).catch(() => process.exit(1));
}
