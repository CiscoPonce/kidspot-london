import { enrichMissingDetails } from './sources/enrichment.js';

export async function processEnrichment(isDryRun: boolean = false) {
  console.log(`Starting Data Enrichment Pipeline${isDryRun ? ' (DRY RUN)' : ''}...`);

  if (isDryRun) {
    console.log('Dry run: would reverse-geocode venues missing postcode/address/borough.');
    return { success: true, dryRun: true, enriched: 0, skipped: 0, failed: 0 };
  }

  try {
    const result = await enrichMissingDetails();
    console.log(`\nEnrichment complete: ${result.enriched} enriched, ${result.skipped} skipped, ${result.failed} failed.`);
    return { success: true, dryRun: false, ...result };
  } catch (error) {
    console.error('Enrichment pipeline failed:', error);
    throw error;
  }
}

// Allow running from command line directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  processEnrichment(args.includes('--dry-run'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
