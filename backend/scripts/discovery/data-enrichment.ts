import { enrichMissingDetails } from './sources/enrichment.js';
import { enrichOsmContacts } from './sources/osm-contact-enrichment.js';
import { enrichViaApify } from './sources/apify-enrichment.js';
import { enrichViaWebScraping } from './sources/web-scraper-enrichment.js';

export async function processEnrichment(isDryRun: boolean = false) {
  console.log(`Starting Data Enrichment Pipeline${isDryRun ? ' (DRY RUN)' : ''}...`);
  console.log(`  Time: ${new Date().toISOString()}\n`);

  if (isDryRun) {
    console.log('Dry run: would run reverse-geocoding, OSM contact extraction, Apify enrichment, and web scraping.');
    return { success: true, dryRun: true, geocoding: null, osmContacts: null, apify: null, webScraper: null };
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
    const osmResult = await enrichOsmContacts(100);
    results.osmContacts = osmResult;
    console.log(`  → ${osmResult.enriched} enriched, ${osmResult.skipped} skipped, ${osmResult.failed} failed.\n`);
  } catch (error) {
    console.error('Layer 1 (OSM contacts) failed:', error);
    results.osmContacts = { error: String(error) };
  }

  // Layer 2: Apify Google Maps Enrichment
  try {
    console.log('═══ Layer 2: Apify Google Maps Enrichment ═══');
    const apifyResult = await enrichViaApify(200);
    results.apify = apifyResult;
    console.log(`  → ${apifyResult.enriched} enriched, ${apifyResult.skipped} skipped, ${apifyResult.failed} failed.\n`);
  } catch (error) {
    console.error('Layer 2 (Apify scraper) failed:', error);
    results.apify = { error: String(error) };
  }

  // Layer 3: Web scraper enrichment (Brave Search + HTML scraping)
  try {
    console.log('═══ Layer 3: Web Scraper Enrichment ═══');
    const webResult = await enrichViaWebScraping(10);
    results.webScraper = webResult;
    console.log(`  → ${webResult.enriched} enriched, ${webResult.skipped} skipped, ${webResult.failed} failed.\n`);
  } catch (error) {
    console.error('Layer 3 (web scraper) failed:', error);
    results.webScraper = { error: String(error) };
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
