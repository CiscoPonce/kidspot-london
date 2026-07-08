import { logger } from '../../src/config/logger.js';
import env from '../../src/config/env.js';

export interface DataMaxSweepResult {
  googlePlacesDiscovery: { status: 'fulfilled' | 'rejected'; data?: unknown; error?: unknown };
  chainExpansion: { status: 'fulfilled' | 'rejected'; data?: unknown; error?: unknown };
  postcodesioGeocoding: { status: 'fulfilled' | 'rejected'; data?: unknown; error?: unknown };
  imageEnrichment: { status: 'fulfilled' | 'rejected'; data?: unknown; error?: unknown };
  duration: number;
}

/**
 * Data Max sweep orchestrator
 *
 * Runs all four enrichment sweeps concurrently:
 * 1. Google Places discovery — finds new venues in under-represented boroughs
 * 2. Chain expansion — discovers chain brand locations via Google Places Text Search
 * 3. Postcodes.io geocoding — backfills lat/lon and postcodes
 * 4. Image enrichment — triggers existing Brave/Street View image jobs
 *
 * Each sweep has individual error isolation via Promise.allSettled.
 */
export async function runDataMaxSweeps(dryRun: boolean = false): Promise<DataMaxSweepResult> {
  const startTime = Date.now();
  logger.info('=== KidSpot London - Data Max Sweep ===');
  if (dryRun) logger.info('DRY RUN MODE: No data will be written');

  const googlePlacesTask = async () => {
    logger.info('--- Google Places Discovery ---');
    const { discoverVenuesViaGooglePlaces } = await import('./sources/google-places-discovery.js');
    const result = await discoverVenuesViaGooglePlaces(50);
    logger.info({ result }, 'Google Places discovery complete');
    return result;
  };

  const chainExpansionTask = async () => {
    logger.info('--- Chain Expansion ---');
    const { discoverChains } = await import('./chain-expansion.js');
    const result = await discoverChains(dryRun);
    logger.info({ result }, 'Chain expansion complete');
    return result;
  };

  const postcodesTask = async () => {
    logger.info('--- Postcodes.io Geocoding ---');
    const { geocodeViaPostcodesIo } = await import('./sources/postcodesio-geocoding.js');
    const result = await geocodeViaPostcodesIo(100);
    logger.info({ result }, 'Postcodes.io geocoding complete');
    return result;
  };

  const imageTask = async () => {
    logger.info('--- Image Enrichment (Brave + Street View) ---');
    const { Queue } = await import('bullmq');
    const { redis: redisClient } = await import('../../src/clients/redis.js');

    const discoveryQueue = new Queue('kidspot-discovery', { connection: redisClient });

    const jobs = [];

    if (!dryRun) {
      // Trigger existing Brave image enrichment job
      const braveJob = await discoveryQueue.add(
        'enrich-brave-images',
        { batchSize: 50 },
        {
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 86400 }
        }
      );
      jobs.push({ job: 'enrich-brave-images', id: braveJob.id });

      // Trigger existing Street View enrichment job
      const streetviewJob = await discoveryQueue.add(
        'enrich-streetview',
        { batchSize: 50 },
        {
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 86400 }
        }
      );
      jobs.push({ job: 'enrich-streetview', id: streetviewJob.id });
    }

    logger.info({ jobs, dryRun }, 'Image enrichment jobs queued');
    return { queued: jobs.length, dryRun };
  };

  const sweepTasks = [googlePlacesTask, chainExpansionTask, postcodesTask, imageTask];
  const sweepNames = ['google-places-discovery', 'chain-expansion', 'postcodesio-geocoding', 'image-enrichment'];

  const results = await Promise.allSettled(sweepTasks.map(t => t()));

  const sweepResult: DataMaxSweepResult = {
    googlePlacesDiscovery: { status: 'rejected' },
    chainExpansion: { status: 'rejected' },
    postcodesioGeocoding: { status: 'rejected' },
    imageEnrichment: { status: 'rejected' },
    duration: 0
  };

  results.forEach((result, i) => {
    const name = sweepNames[i];
    if (result.status === 'fulfilled') {
      logger.info({ sweep: name, data: result.value }, 'Sweep completed');
      if (name === 'google-places-discovery') sweepResult.googlePlacesDiscovery = { status: 'fulfilled', data: result.value };
      if (name === 'chain-expansion') sweepResult.chainExpansion = { status: 'fulfilled', data: result.value };
      if (name === 'postcodesio-geocoding') sweepResult.postcodesioGeocoding = { status: 'fulfilled', data: result.value };
      if (name === 'image-enrichment') sweepResult.imageEnrichment = { status: 'fulfilled', data: result.value };
    } else {
      logger.error({ sweep: name, error: result.reason }, 'Sweep failed');
      if (name === 'google-places-discovery') sweepResult.googlePlacesDiscovery = { status: 'rejected', error: result.reason };
      if (name === 'chain-expansion') sweepResult.chainExpansion = { status: 'rejected', error: result.reason };
      if (name === 'postcodesio-geocoding') sweepResult.postcodesioGeocoding = { status: 'rejected', error: result.reason };
      if (name === 'image-enrichment') sweepResult.imageEnrichment = { status: 'rejected', error: result.reason };
    }
  });

  const duration = Math.round((Date.now() - startTime) / 1000);
  sweepResult.duration = duration;

  const fulfilled = results.filter(r => r.status === 'fulfilled').length;
  const rejected = results.filter(r => r.status === 'rejected').length;

  logger.info({ durationSeconds: duration, sweeps: sweepNames.length, fulfilled, rejected }, '=== Data Max Sweep Complete ===');

  return sweepResult;
}

// Allow running directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  runDataMaxSweeps(isDryRun)
    .then((result) => {
      if (isDryRun) {
        logger.info({ result }, 'Data Max Sweep (dry run) summary');
      } else {
        logger.info({ result }, 'Data Max Sweep complete');
      }
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Data Max Sweep failed');
      process.exit(1);
    });
}
