import { enrichMissingDetails } from './sources/enrichment.js';
import { enrichOsmContacts } from './sources/osm-contact-enrichment.js';
import { enrichViaWebScraping } from './sources/web-scraper-enrichment.js';
import { enrichViaApify } from './sources/apify-enrichment.js';
import { db } from '../../src/clients/db.js';

/**
 * Smart Parks: auto-generate OSM map links for parks without websites.
 * This gives users a clickable destination instead of an empty card.
 */
async function enrichParksWithOsmLinks(): Promise<{ updated: number }> {
  const { rowCount } = await db.query(`
    UPDATE venues SET
      website = 'https://www.openstreetmap.org/node/' || source_id
    WHERE is_active = TRUE
      AND source = 'osm'
      AND type = 'park'
      AND (website IS NULL OR website = '')
      AND source_id IS NOT NULL
      AND source_id != ''
  `);
  return { updated: rowCount || 0 };
}

export async function processEnrichment(isDryRun: boolean = false) {
  console.log(`Starting Data Enrichment Pipeline${isDryRun ? ' (DRY RUN)' : ''}...`);
  console.log(`  Time: ${new Date().toISOString()}\n`);

  if (isDryRun) {
    console.log('Dry run: would run reverse-geocoding, OSM contact extraction, web scraping, Apify, and park links.');
    return { success: true, dryRun: true, geocoding: null, osmContacts: null, webScraper: null, apify: null, parkLinks: null };
  }

  const results: Record<string, any> = {};

  // Layer 0: Reverse-geocoding (address/postcode/borough)
  try {
    console.log('═══ Layer 0: Reverse-Geocoding ═══');
    const geocodingResult = await enrichMissingDetails();
    results.geocoding = geocodingResult;
    console.log(`  → ${geocodingResult.enriched} enriched, ${geocodingResult.skipped} skipped, ${geocodingResult.failed} failed.\n`);
  } catch (error) {
    console.error('Layer 0 (reverse-geocoding) failed:', error);
    results.geocoding = { error: String(error) };
  }

  // Layer 1: OSM contact enrichment (website/phone/email from Overpass)
  try {
    console.log('═══ Layer 1: OSM Contact Enrichment ═══');
    const osmResult = await enrichOsmContacts(200);
    results.osmContacts = osmResult;
    console.log(`  → ${osmResult.enriched} enriched, ${osmResult.skipped} skipped, ${osmResult.failed} failed.\n`);
  } catch (error) {
    console.error('Layer 1 (OSM contacts) failed:', error);
    results.osmContacts = { error: String(error) };
  }

  // Layer 2: Web scraper enrichment (Brave Search + HTML scraping)
  try {
    console.log('═══ Layer 2: Web Scraper Enrichment ═══');
    const webResult = await enrichViaWebScraping(30);
    results.webScraper = webResult;
    console.log(`  → ${webResult.enriched} enriched, ${webResult.skipped} skipped, ${webResult.failed} failed.\n`);
  } catch (error) {
    console.error('Layer 2 (web scraper) failed:', error);
    results.webScraper = { error: String(error) };
  }

  // Layer 3: Apify Google Places enrichment
  try {
    console.log('═══ Layer 3: Apify Google Places ═══');
    const apifyResult = await enrichViaApify(20);
    results.apify = apifyResult;
    console.log(`  → enriched=${apifyResult.enriched}, skipped=${apifyResult.skipped}, failed=${apifyResult.failed}\n`);
  } catch (error) {
    console.error('Layer 3 (Apify) failed:', error);
    results.apify = { error: String(error) };
  }

  // Layer 4: Smart Parks — OSM map link fallback
  try {
    console.log('═══ Layer 4: Smart Parks OSM Links ═══');
    const parkResult = await enrichParksWithOsmLinks();
    results.parkLinks = parkResult;
    console.log(`  → ${parkResult.updated} parks updated with OSM map links.\n`);
  } catch (error) {
    console.error('Layer 4 (park links) failed:', error);
    results.parkLinks = { error: String(error) };
  }

  console.log('═══ Pipeline Complete ═══');
  return { success: true, dryRun: false, ...results };
}

// Allow running from command line directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  processEnrichment(args.includes('--dry-run'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
