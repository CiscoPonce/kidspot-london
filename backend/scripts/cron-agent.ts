#!/usr/bin/env node

import { db } from '../src/clients/db.js';
import dotenv from 'dotenv';
import { runAllDiscovery } from './discovery/run-discovery.js';
import { venueService } from '../src/services/venueService.js';
import { fhrsService } from '../src/services/fhrsService.js';
dotenv.config();

// Configuration
const STALE_HOURS = 24; // Mark venues as stale after 24 hours
const BATCH_SIZE = 50;

export interface StaleVenueIngestMetrics {
  processed: number;
  updated: number;
  deactivated: number;
  failed: number;
  skipped: number;
  conflicts: number;
  sources: Record<string, number>;
  dry_run: boolean;
  duration_ms: number;
}

// Update venue information
async function updateVenue(venue: any) {
  const { id: venueId, name: venueName } = venue;
  try {
    await db.query('SELECT update_venue_scrape_time($1)', [venueId]);

    // Try FHRS matching if not already matched
    if (!venue.fhrs_establishment_id) {
      const fhrsMatch = await venueService.matchVenueToFhrs(venueId);
      if (fhrsMatch) {
        console.log(`  ✓ FHRS Match found: ${fhrsMatch.business_name} (${fhrsMatch.rating_value})`);
        await venueService.updateVenueFromFhrs(venueId, fhrsMatch.id);
      }
    }

    return { status: 'updated', message: 'Timestamps updated' };
  } catch (error: any) {
    console.error(`Error updating venue ${venueId}:`, error.message);
    return { status: 'error', message: error.message };
  }
}

/**
 * Run standalone batch matching for FHRS
 */
export async function runFhrsBatchMatching(options?: {
  limit?: number;
  dryRun?: boolean;
}) {
  const startMs = Date.now();
  const limit = options?.limit || 100;
  const dryRun = Boolean(options?.dryRun);

  console.log('Starting FHRS batch matching...');
  console.log(`Options: limit=${limit}, dry_run=${dryRun}\n`);

  try {
    const result = await venueService.batchMatchVenuesToFhrs(limit);
    const duration = Date.now() - startMs;
    
    console.log('\n=== FHRS Batch Matching Summary ===');
    console.log(`Processed: ${result.total}`);
    console.log(`Matched & Updated: ${result.matched}`);
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    
    return result;
  } catch (error) {
    console.error('Error in FHRS batch matching:', error);
    throw error;
  }
}

// Process venues that need scraping
export async function processStaleVenues(options?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<StaleVenueIngestMetrics> {
  const startMs = Date.now();
  const rawLimit = options?.limit;
  const limit = Number.isFinite(Number(rawLimit))
    ? Math.min(Math.max(Math.floor(Number(rawLimit)), 1), 500)
    : BATCH_SIZE;
  const dryRun = Boolean(options?.dryRun);

  const metrics: StaleVenueIngestMetrics = {
    processed: 0,
    updated: 0,
    deactivated: 0,
    failed: 0,
    skipped: 0,
    conflicts: 0,
    sources: {},
    dry_run: dryRun,
    duration_ms: 0,
  };

  const bumpSource = (venue: any) => {
    const s = venue.source || 'unknown';
    metrics.sources[s] = (metrics.sources[s] || 0) + 1;
  };

  console.log('Processing venues that need scraping...\n');
  console.log(`Options: limit=${limit}, dry_run=${dryRun}\n`);

  try {
    const result = await db.query('SELECT * FROM get_venues_needing_scrape($1)', [STALE_HOURS]);
    let venues = result.rows;

    console.log(`Found ${venues.length} venues needing scrape\n`);

    if (venues.length === 0) {
      console.log('No venues need scraping. All up to date!');
      metrics.duration_ms = Date.now() - startMs;
      return metrics;
    }

    venues = venues.slice(0, limit);
    const batchTotal = venues.length;

    if (dryRun) {
      for (const venue of venues) {
        metrics.processed++;
        bumpSource(venue);
        metrics.skipped++;
        console.log(`[dry_run] Would process: ${venue.name} (${venue.source})`);
      }
      console.log('\n=== Processing Summary (dry run) ===');
      console.log(JSON.stringify(metrics, null, 2));
      metrics.duration_ms = Date.now() - startMs;
      return metrics;
    }

    let processed = 0;
    let updated = 0;
    let deactivated = 0;
    let skipped = 0;
    let conflicts = 0;
    let errors = 0;

    const CONCURRENCY = 5;
    const queue = [...venues.entries()];

    const processVenue = async (venue: any) => {
      const currentProcessed = ++processed;
      console.log(`[${currentProcessed}/${batchTotal}] Processing: ${venue.name} (${venue.source})`);
      bumpSource(venue);

      const res = await updateVenue(venue);

      if (res.status === 'updated') {
        updated++;
        console.log(`  ✓ Updated: ${res.message || 'OK'}`);
      } else if (res.status === 'deactivated') {
        deactivated++;
        console.log(`  ⚠ Deactivated: ${res.message}`);
      } else if (res.status === 'skipped') {
        skipped++;
        console.log(`  ⚐ Skipped: ${res.message}`);
      } else if (res.status === 'conflict') {
        conflicts++;
        console.log(`  ⚠ Conflict: ${res.message}`);
      } else {
        errors++;
        console.log(`  ✗ Error: ${res.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    };

    const workers = Array(Math.min(CONCURRENCY, venues.length))
      .fill(0)
      .map(async () => {
        while (queue.length > 0) {
          const entry = queue.shift();
          if (entry) {
            const [, venue] = entry;
            await processVenue(venue);
          }
        }
      });

    await Promise.all(workers);

    metrics.processed = processed;
    metrics.updated = updated;
    metrics.deactivated = deactivated;
    metrics.skipped = skipped;
    metrics.conflicts = conflicts;
    metrics.failed = errors;

    console.log('\n=== Processing Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Deactivated: ${deactivated}`);
    console.log(`Skipped (Locked/Manual): ${skipped}`);
    console.log(`Conflicts: ${conflicts}`);
    console.log(`Errors: ${errors}`);
  } catch (error) {
    console.error('Error processing stale venues:', error);
    throw error;
  }

  metrics.duration_ms = Date.now() - startMs;
  return metrics;
}

export async function runCronAgent() {
  console.log('=== KidSpot London - Cron Agent ===\n');
  console.log('This agent performs continuous scraping, categorization, and discovery.');
  console.log(`Stale threshold: ${STALE_HOURS} hours\n`);

  const startTime = Date.now();

  try {
    console.log('✓ Connected to database\n');

    await processStaleVenues();

    console.log('\n--- Starting Venue Discovery ---');
    await runAllDiscovery();

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`\n✓ Cron agent complete! Duration: ${duration} seconds`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    // Shared db client cleanup
  }
}

import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  // Handle CLI commands
  const command = process.argv[2];

  if (command === 'fhrs-match') {
    const limit = process.argv[3] ? parseInt(process.argv[3]) : 100;
    const dryRun = process.argv.includes('--dry-run');

    runFhrsBatchMatching({ limit, dryRun })
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    runCronAgent()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}
