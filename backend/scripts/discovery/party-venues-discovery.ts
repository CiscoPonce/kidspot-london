import { fetchCouncilHalls } from './sources/council-halls.js';
import { fetchCharityHalls } from './sources/charity-halls.js';
import { fetchOSMPartyVenues } from './sources/osm-parties.js';

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
    // Here we would push this data to the venueService or the /api/admin/ingest endpoint
    // For now, since this is a new standalone pipeline, we simulate the DB insertion:
    // await venueService.bulkUpsert([...]);
    
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
