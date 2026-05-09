#!/usr/bin/env node

import { db } from '../src/clients/db.js';
import { logger } from '../src/config/logger.js';
import { operatorService } from '../src/services/operatorService.js';
import { batchMatchOperatorVenues } from '../src/services/venueService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

interface ImportMetrics {
  partnership_id: number;
  operator_name: string;
  venues_imported: number;
  failed: number;
  duration_ms: number;
}

export async function runOperatorImport(options?: {
  partnershipId?: number;
  dryRun?: boolean;
}): Promise<{
  total_partnerships: number;
  total_venues_imported: number;
  total_failed: number;
  total_matched: number;
  duration_ms: number;
  partnerships: ImportMetrics[];
}> {
  const startMs = Date.now();
  const dryRun = Boolean(options?.dryRun);

  logger.info({ dryRun }, 'Starting Operator data import');

  const overallMetrics = {
    total_partnerships: 0,
    total_venues_imported: 0,
    total_failed: 0,
    total_matched: 0,
    duration_ms: 0,
    partnerships: [] as ImportMetrics[],
  };

  try {
    // Get partnerships to import
    let partnerships;
    if (options?.partnershipId) {
      const p = await operatorService.getPartnership(options.partnershipId);
      partnerships = p ? [p] : [];
    } else {
      partnerships = await operatorService.getActivePartnerships();
    }

    overallMetrics.total_partnerships = partnerships.length;
    console.log(`Found ${partnerships.length} active operator partnerships to process.`);

    for (const p of partnerships) {
      const pStartMs = Date.now();
      console.log(`\n[${p.operator_name}] Ingesting data: ${p.data_source_url || 'locator'}...`);

      try {
        if (dryRun) {
          console.log(`  ⚐ Dry run: Skipping actual import for ${p.operator_name}`);
          overallMetrics.partnerships.push({
            partnership_id: p.id,
            operator_name: p.operator_name,
            venues_imported: 0,
            failed: 0,
            duration_ms: 0,
          });
          continue;
        }

        let result;
        if (p.partnership_type === 'crawler') {
          // Note: Real implementation would handle legal review gates/ToS versions
          console.log(`  ⚐ Crawler partnership: Requires legal review.`);
          result = { venues_imported: 0, failed: 0 };
        } else {
          result = await operatorService.importPartnerData(p.id);
        }

        overallMetrics.total_venues_imported += result.venues_imported;
        overallMetrics.total_failed += result.failed;

        overallMetrics.partnerships.push({
          partnership_id: p.id,
          operator_name: p.operator_name,
          venues_imported: result.venues_imported,
          failed: result.failed,
          duration_ms: Date.now() - pStartMs,
        });

        console.log(`  ✓ Done: Venues ${result.venues_imported}, Failed ${result.failed}`);
      } catch (error: any) {
        logger.error({ err: error, partnershipId: p.id }, 'Failed to import operator data');
        overallMetrics.total_failed++;

        overallMetrics.partnerships.push({
          partnership_id: p.id,
          operator_name: p.operator_name,
          venues_imported: 0,
          failed: 1,
          duration_ms: Date.now() - pStartMs,
        });
        console.error(`  ✗ Error: ${error.message}`);
      }
    }

    // Match operator venues to venues
    if (!dryRun && overallMetrics.total_venues_imported > 0) {
      console.log('\nMatching operator venues to existing venues...');
      const matchResult = await batchMatchOperatorVenues(100);
      overallMetrics.total_matched = matchResult.matched;
      console.log(`  ✓ Done: Matched ${matchResult.matched} operator venues to venues.`);
    }

    overallMetrics.duration_ms = Date.now() - startMs;
    console.log(`\n=== Overall Operator Import Summary ===`);
    console.log(`Total Partnerships: ${overallMetrics.total_partnerships}`);
    console.log(`Total Venues: ${overallMetrics.total_venues_imported}`);
    console.log(`Total Matched: ${overallMetrics.total_matched}`);
    console.log(`Duration: ${Math.round(overallMetrics.duration_ms / 1000)}s`);

    return overallMetrics;
  } catch (error) {
    logger.error({ err: error }, 'Operator import process failed');
    overallMetrics.duration_ms = Date.now() - startMs;
    return overallMetrics;
  }
}

// CLI entry point
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const partnershipId = process.argv[2] && !process.argv[2].startsWith('--') ? parseInt(process.argv[2]) : undefined;
  const dryRun = process.argv.includes('--dry-run');

  runOperatorImport({ partnershipId, dryRun })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
