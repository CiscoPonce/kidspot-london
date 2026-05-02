#!/usr/bin/env node

import { db } from '../src/clients/db.js';
import dotenv from 'dotenv';
import { runAllDiscovery } from './discovery/run-discovery.js';
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
  sources: Record<string, number>;
  dry_run: boolean;
  duration_ms: number;
}

// Yelp Fusion API configuration
import { yelpService } from '../src/services/yelpService.js';
import { calculateKidScore } from '../src/scoring/kidScore.js';

// Map Yelp categories to our venue types
export function mapVenueType(yelpCategories: any[]) {
  const typeMap: Record<string, string> = {
    kids_activities: 'softplay',
    playgrounds: 'park',
    parks: 'park',
    recreation: 'leisure_centre',
    gyms: 'leisure_centre',
    leisure_centers: 'leisure_centre',
    communitycenters: 'community_hall',
    libraries: 'library',
    museums: 'museum',
    cafes: 'cafe',
  };

  if (yelpCategories && Array.isArray(yelpCategories)) {
    for (const category of yelpCategories) {
      if (category.alias && typeMap[category.alias]) {
        return typeMap[category.alias];
      }
    }
  }

  return 'other';
}

// Update venue information using Yelp Fusion API
async function updateVenue(venue: any) {
  const { id: venueId, name: venueName, lat, lon } = venue;
  try {
    const searchParams: any = {
      term: venueName,
      limit: 1,
    };

    if (lat && lon && lat !== 0 && lon !== 0) {
      searchParams.latitude = lat;
      searchParams.longitude = lon;
      searchParams.radius = 100;
    } else {
      searchParams.location = 'London, UK';
    }

    const searchResults = await yelpService.searchBusinesses(searchParams);

    const details = searchResults.length > 0 ? searchResults[0] : null;

    if (!details) {
      await db.query('SELECT update_venue_scrape_time($1)', [venueId]);
      return { status: 'updated', message: 'Venue not found on Yelp. Timestamp updated.' };
    }

    if (details.is_closed) {
      await db.query('SELECT deactivate_venue($1, $2, $3)', [
        venueId,
        'permanently_closed',
        'Detected via Yelp Fusion API',
      ]);
      return { status: 'deactivated', message: 'Venue permanently closed' };
    }

    const newType = mapVenueType(details.categories || []);

    const kidScoreInput = {
      name: details.name || venueName,
      types: [newType],
      rating: details.rating,
      user_ratings_total: details.review_count,
    };

    const kidScore = calculateKidScore(kidScoreInput);

    await db.query(
      `UPDATE venues 
       SET type = $1, rating = $2, user_ratings_total = $3, kid_score = $4, enriched_at = NOW(), last_scraped = NOW(), source_id = COALESCE(source_id, $5)
       WHERE id = $6`,
      [newType, details.rating || null, details.review_count || null, kidScore, details.id, venueId],
    );

    return { status: 'updated', type: newType, kidScore, message: 'Updated via Yelp' };
  } catch (error: any) {
    console.error(`Error updating venue ${venueId}:`, error.message);
    return { status: 'error', message: error.message };
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
    metrics.failed = errors;

    console.log('\n=== Processing Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Deactivated: ${deactivated}`);
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
  runCronAgent()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
