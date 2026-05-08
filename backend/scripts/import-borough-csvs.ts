#!/usr/bin/env node

import { db } from '../src/clients/db.js';
import { logger } from '../src/config/logger.js';
import { importBoroughCsv, getBoroughCsvSources } from '../src/services/venueService.js';
import { BoroughCsvSource } from '../src/types/venue.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

interface ImportMetrics {
  source_id: number;
  borough_name: string;
  dataset_name: string;
  imported: number;
  matched: number;
  skipped: number;
  failed: number;
  duration_ms: number;
}

export async function runBoroughCsvImport(options?: {
  sourceId?: number;
  dryRun?: boolean;
}): Promise<{
  total_sources: number;
  total_imported: number;
  total_matched: number;
  total_skipped: number;
  total_failed: number;
  duration_ms: number;
  sources: ImportMetrics[];
}> {
  const startMs = Date.now();
  const dryRun = Boolean(options?.dryRun);

  logger.info({ dryRun }, 'Starting borough CSV import');

  const overallMetrics = {
    total_sources: 0,
    total_imported: 0,
    total_matched: 0,
    total_skipped: 0,
    total_failed: 0,
    duration_ms: 0,
    sources: [] as ImportMetrics[],
  };

  try {
    // Get sources to import
    let sources: BoroughCsvSource[] = [];
    if (options?.sourceId) {
      const source = await db.query(
        'SELECT * FROM borough_csv_sources WHERE id = $1 AND is_active = TRUE',
        [options.sourceId]
      );
      sources = source.rows;
    } else {
      sources = await getBoroughCsvSources();
    }

    overallMetrics.total_sources = sources.length;
    console.log(`Found ${sources.length} active borough CSV sources to process.`);

    for (const source of sources) {
      const sourceStartMs = Date.now();
      console.log(`\n[${source.borough_name}] Importing dataset: ${source.dataset_name}...`);
      
      try {
        if (dryRun) {
          console.log(`  ⚐ Dry run: Skipping actual import for ${source.dataset_url}`);
          overallMetrics.sources.push({
            source_id: source.id,
            borough_name: source.borough_name,
            dataset_name: source.dataset_name,
            imported: 0,
            matched: 0,
            skipped: 0,
            failed: 0,
            duration_ms: 0,
          });
          continue;
        }

        const result = await importBoroughCsv(source.id);

        overallMetrics.total_imported += result.imported;
        overallMetrics.total_matched += result.matched;
        overallMetrics.total_skipped += result.skipped;
        overallMetrics.total_failed += result.failed;

        overallMetrics.sources.push({
          source_id: source.id,
          borough_name: source.borough_name,
          dataset_name: source.dataset_name,
          imported: result.imported,
          matched: result.matched,
          skipped: result.skipped,
          failed: result.failed,
          duration_ms: Date.now() - sourceStartMs,
        });

        console.log(`  ✓ Done: Imported ${result.imported}, Matched ${result.matched}, Skipped ${result.skipped}`);
      } catch (error: any) {
        logger.error({ err: error, sourceId: source.id }, 'Failed to import borough CSV source');
        overallMetrics.total_failed++;

        overallMetrics.sources.push({
          source_id: source.id,
          borough_name: source.borough_name,
          dataset_name: source.dataset_name,
          imported: 0,
          matched: 0,
          skipped: 0,
          failed: 1,
          duration_ms: Date.now() - sourceStartMs,
        });
        console.error(`  ✗ Error: ${error.message}`);
      }
    }

    overallMetrics.duration_ms = Date.now() - startMs;
    console.log(`\n=== Overall Import Summary ===`);
    console.log(`Total Sources: ${overallMetrics.total_sources}`);
    console.log(`Total Imported: ${overallMetrics.total_imported}`);
    console.log(`Total Matched: ${overallMetrics.total_matched}`);
    console.log(`Total Failed: ${overallMetrics.total_failed}`);
    console.log(`Duration: ${Math.round(overallMetrics.duration_ms / 1000)}s`);

    return overallMetrics;
  } catch (error) {
    logger.error({ err: error }, 'Borough CSV import process failed');
    overallMetrics.duration_ms = Date.now() - startMs;
    return overallMetrics;
  }
}

// CLI entry point
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const sourceId = process.argv[2] && !process.argv[2].startsWith('--') ? parseInt(process.argv[2]) : undefined;
  const dryRun = process.argv.includes('--dry-run');

  runBoroughCsvImport({ sourceId, dryRun })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
