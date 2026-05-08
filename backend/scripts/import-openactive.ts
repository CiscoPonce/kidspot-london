#!/usr/bin/env node

import { db } from '../src/clients/db.js';
import { logger } from '../src/config/logger.js';
import { openactiveService } from '../src/services/openactiveService.js';
import { batchMatchOpenActiveLocations } from '../src/services/venueService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

interface ImportMetrics {
  feed_id: number;
  publisher_name: string;
  feed_type: string;
  locations_imported: number;
  sessions_imported: number;
  failed: number;
  duration_ms: number;
}

export async function runOpenActiveImport(options?: {
  feedId?: number;
  dryRun?: boolean;
}): Promise<{
  total_feeds: number;
  total_locations_imported: number;
  total_sessions_imported: number;
  total_failed: number;
  total_matched: number;
  duration_ms: number;
  feeds: ImportMetrics[];
}> {
  const startMs = Date.now();
  const dryRun = Boolean(options?.dryRun);

  logger.info({ dryRun }, 'Starting OpenActive import');

  const overallMetrics = {
    total_feeds: 0,
    total_locations_imported: 0,
    total_sessions_imported: 0,
    total_failed: 0,
    total_matched: 0,
    duration_ms: 0,
    feeds: [] as ImportMetrics[],
  };

  try {
    // Get feeds to import
    let feeds;
    if (options?.feedId) {
      const feed = await openactiveService.getFeed(options.feedId);
      feeds = feed ? [feed] : [];
    } else {
      feeds = await openactiveService.getActiveFeeds();
    }

    overallMetrics.total_feeds = feeds.length;
    console.log(`Found ${feeds.length} active OpenActive feeds to process.`);

    for (const feed of feeds) {
      const feedStartMs = Date.now();
      console.log(`\n[${feed.publisher_name}] Ingesting feed: ${feed.feed_url}...`);

      try {
        if (dryRun) {
          console.log(`  ⚐ Dry run: Skipping actual import for ${feed.feed_url}`);
          overallMetrics.feeds.push({
            feed_id: feed.id,
            publisher_name: feed.publisher_name,
            feed_type: feed.feed_type,
            locations_imported: 0,
            sessions_imported: 0,
            failed: 0,
            duration_ms: 0,
          });
          continue;
        }

        const result = await openactiveService.ingestFeed(feed.id);

        overallMetrics.total_locations_imported += result.locations_imported;
        overallMetrics.total_sessions_imported += result.sessions_imported;
        overallMetrics.total_failed += result.failed;

        overallMetrics.feeds.push({
          feed_id: feed.id,
          publisher_name: feed.publisher_name,
          feed_type: feed.feed_type,
          locations_imported: result.locations_imported,
          sessions_imported: result.sessions_imported,
          failed: result.failed,
          duration_ms: Date.now() - feedStartMs,
        });

        console.log(`  ✓ Done: Locations ${result.locations_imported}, Sessions ${result.sessions_imported}, Failed ${result.failed}`);
      } catch (error: any) {
        logger.error({ err: error, feedId: feed.id }, 'Failed to import OpenActive feed');
        overallMetrics.total_failed++;

        overallMetrics.feeds.push({
          feed_id: feed.id,
          publisher_name: feed.publisher_name,
          feed_type: feed.feed_type,
          locations_imported: 0,
          sessions_imported: 0,
          failed: 1,
          duration_ms: Date.now() - feedStartMs,
        });
        console.error(`  ✗ Error: ${error.message}`);
      }
    }

    // Match OpenActive locations to venues
    if (!dryRun && overallMetrics.total_locations_imported > 0) {
      console.log('\nMatching OpenActive locations to existing venues...');
      const matchResult = await batchMatchOpenActiveLocations(100);
      overallMetrics.total_matched = matchResult.matched;
      console.log(`  ✓ Done: Matched ${matchResult.matched} locations to venues.`);
    }

    overallMetrics.duration_ms = Date.now() - startMs;
    console.log(`\n=== Overall OpenActive Import Summary ===`);
    console.log(`Total Feeds: ${overallMetrics.total_feeds}`);
    console.log(`Total Locations: ${overallMetrics.total_locations_imported}`);
    console.log(`Total Sessions: ${overallMetrics.total_sessions_imported}`);
    console.log(`Total Matched: ${overallMetrics.total_matched}`);
    console.log(`Duration: ${Math.round(overallMetrics.duration_ms / 1000)}s`);

    return overallMetrics;
  } catch (error) {
    logger.error({ err: error }, 'OpenActive import process failed');
    overallMetrics.duration_ms = Date.now() - startMs;
    return overallMetrics;
  }
}

// CLI entry point
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const feedId = process.argv[2] && !process.argv[2].startsWith('--') ? parseInt(process.argv[2]) : undefined;
  const dryRun = process.argv.includes('--dry-run');

  runOpenActiveImport({ feedId, dryRun })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
