import { Worker, Job, Queue } from 'bullmq';
import { redis } from './clients/redis.js';
import { logger } from './config/logger.js';
import env from './config/env.js';
import { StaleIngestLockedError, withStaleIngestLock } from './services/ingestLock.js';

logger.info('=== KidSpot London - Background Worker ===');
logger.info(`Connected to Redis at: ${env.REDIS_URL}`);

// ──────────────────────────────────────────────────
// Job data interfaces
// ──────────────────────────────────────────────────
interface DiscoveryJobData {
  // Define expected job data structure here if needed
}

interface ProcessStaleJobData {
  limit?: number;
  dryRun?: boolean;
}

interface EnrichmentJobData {
  batchSize?: number;
  layer?: 'geocode' | 'osm-contacts' | 'web-scrape' | 'apify';
}

interface DedupJobData {
  dryRun?: boolean;
}

// ──────────────────────────────────────────────────
// Queue for scheduling repeatable jobs
// ──────────────────────────────────────────────────
const discoveryQueue = new Queue('discovery', { connection: redis });

// ──────────────────────────────────────────────────
// Set up autonomous repeatable jobs (Enrichment Engine)
// These are idempotent — BullMQ deduplicates by repeat key
// ──────────────────────────────────────────────────
async function setupRepeatingJobs() {
  try {
    // Layer 0: Reverse-geocoding (address/postcode/borough)
    // Every 4 hours, batch of 200
    await discoveryQueue.add('enrich-geocode', { batchSize: 200 }, {
      repeat: { pattern: '0 */4 * * *' }, // Every 4 hours
      jobId: 'repeat:enrich-geocode',
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    });

    // Layer 1: OSM contact enrichment (website/phone/email from Overpass)
    // Every 6 hours, batch of 200
    await discoveryQueue.add('enrich-osm-contacts', { batchSize: 200 }, {
      repeat: { pattern: '30 */6 * * *' }, // Every 6 hours, offset by 30 min
      jobId: 'repeat:enrich-osm-contacts',
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    });

    // Layer 2: Web scraper enrichment (Brave Search + HTML scraping)
    // Every 8 hours, batch of 30
    await discoveryQueue.add('enrich-web-scrape', { batchSize: 30 }, {
      repeat: { pattern: '15 */8 * * *' }, // Every 8 hours, offset by 15 min
      jobId: 'repeat:enrich-web-scrape',
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    });

    // Layer 3: Apify Google Places enrichment
    // Daily at 03:00 UTC, batch of 20 (respecting free tier)
    await discoveryQueue.add('enrich-apify', { batchSize: 20 }, {
      repeat: { pattern: '0 3 * * *' }, // Daily at 03:00
      jobId: 'repeat:enrich-apify',
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    });

    // Layer 3.5: Yelp Fusion details enrichment
    // Daily at 04:00 UTC, batch of 30 (free details)
    await discoveryQueue.add('enrich-yelp-details', { batchSize: 30 }, {
      repeat: { pattern: '0 4 * * *' }, // Daily at 04:00
      jobId: 'repeat:enrich-yelp-details',
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    });

    // Yelp softplay borough-based grid discovery
    // Weekly on Tuesday at 01:00 UTC
    await discoveryQueue.add('discover-yelp-grid', {}, {
      repeat: { pattern: '0 1 * * 2' }, // Weekly on Tuesday
      jobId: 'repeat:discover-yelp-grid',
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
    });

    // Deduplication sweep — weekly on Sunday at 05:00 UTC
    await discoveryQueue.add('dedup-sweep', { dryRun: false }, {
      repeat: { pattern: '0 5 * * 0' }, // Sunday at 05:00
      jobId: 'repeat:dedup-sweep',
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
    });

    // Full discovery run — weekly on Monday at 02:00 UTC
    await discoveryQueue.add('run-discovery', {}, {
      repeat: { pattern: '0 2 * * 1' }, // Monday at 02:00
      jobId: 'repeat:run-discovery',
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
    });

    logger.info('Repeatable enrichment jobs registered successfully');
  } catch (err) {
    logger.error({ err }, 'Error setting up repeating jobs');
  }
}

// ──────────────────────────────────────────────────
// Worker: processes all job types
// ──────────────────────────────────────────────────
const worker = new Worker(
  'discovery',
  async (job: Job) => {
    const startMs = Date.now();
    logger.info({ jobId: job.id, jobName: job.name, data: job.data }, 'Processing job...');

    try {
      switch (job.name) {
        // ── Discovery ──
        case 'run-discovery': {
          const { runAllDiscovery } = await import('../scripts/discovery/run-discovery.js');
          await runAllDiscovery();
          break;
        }

        // ── Stale venue refresh ──
        case 'process-stale': {
          const { processStaleVenues } = await import('../scripts/cron-agent.js');
          const data = (job.data || {}) as ProcessStaleJobData;
          try {
            await withStaleIngestLock(async () => {
              await processStaleVenues({ limit: data.limit, dryRun: data.dryRun });
            });
          } catch (err) {
            if (err instanceof StaleIngestLockedError) {
              logger.warn({ jobId: job.id }, 'Stale ingest skipped: lock held by another runner');
              return { status: 'skipped', reason: 'ingest_already_running' };
            }
            throw err;
          }
          break;
        }

        // ── Layer 0: Reverse-geocoding ──
        case 'enrich-geocode': {
          const { enrichMissingDetails } = await import('../scripts/discovery/sources/enrichment.js');
          const result = await enrichMissingDetails();
          logger.info({ result }, 'Geocoding enrichment complete');
          return { status: 'completed', ...result };
        }

        // ── Layer 1: OSM contact enrichment ──
        case 'enrich-osm-contacts': {
          const { enrichOsmContacts } = await import('../scripts/discovery/sources/osm-contact-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 200;
          const result = await enrichOsmContacts(batchSize);
          logger.info({ result }, 'OSM contact enrichment complete');
          return { status: 'completed', ...result };
        }

        // ── Layer 2: Web scraper enrichment ──
        case 'enrich-web-scrape': {
          const { enrichViaWebScraping } = await import('../scripts/discovery/sources/web-scraper-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 30;
          const result = await enrichViaWebScraping(batchSize);
          logger.info({ result }, 'Web scraper enrichment complete');
          return { status: 'completed', ...result };
        }

        // ── Layer 3: Apify Google Places enrichment ──
        case 'enrich-apify': {
          const { enrichViaApify } = await import('../scripts/discovery/sources/apify-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 20;
          const result = await enrichViaApify(batchSize);
          logger.info({ result }, 'Apify enrichment complete');
          return { status: 'completed', ...result };
        }

        // ── Layer 3.5: Yelp details enrichment ──
        case 'enrich-yelp-details': {
          const { enrichViaYelpDetails } = await import('../scripts/discovery/sources/yelp-details-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 30;
          const result = await enrichViaYelpDetails(batchSize);
          logger.info({ result }, 'Yelp details enrichment complete');
          return { status: 'completed', ...result };
        }

        // ── Yelp softplay grid discovery ──
        case 'discover-yelp-grid': {
          const { runYelpGridSoftplayDiscovery } = await import('../scripts/discovery/sources/yelp-grid-softplay.js');
          const result = await runYelpGridSoftplayDiscovery();
          logger.info({ result }, 'Yelp grid softplay discovery complete');
          return { status: 'completed', ...result };
        }

        // ── Deduplication sweep ──
        case 'dedup-sweep': {
          const { runDedupSweep } = await import('../scripts/discovery/dedup-sweep.js');
          const dryRun = (job.data as DedupJobData)?.dryRun ?? false;
          const result = await runDedupSweep(dryRun);
          logger.info({ result }, 'Dedup sweep complete');
          return { status: 'completed', ...result };
        }

        default:
          logger.warn({ jobName: job.name }, 'Unknown job type');
      }
    } catch (error) {
      logger.error({ err: error, jobId: job.id, durationMs: Date.now() - startMs }, 'Error processing job');
      throw error;
    }

    const durationMs = Date.now() - startMs;
    logger.info({ jobId: job.id, jobName: job.name, durationMs }, 'Job finished');
    return { status: 'completed' };
  },
  {
    connection: redis,
    concurrency: 1, // Run one job at a time to avoid API rate limit conflicts
  },
);

// ──────────────────────────────────────────────────
// Worker event handlers
// ──────────────────────────────────────────────────
worker.on('completed', (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Job completed successfully');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, 'Job failed');
});

// ──────────────────────────────────────────────────
// Graceful shutdown
// ──────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('Worker shutting down (SIGTERM)...');
  await worker.close();
  await discoveryQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Worker shutting down (SIGINT)...');
  await worker.close();
  await discoveryQueue.close();
  process.exit(0);
});

// ──────────────────────────────────────────────────
// Initialize repeatable jobs and start
// ──────────────────────────────────────────────────
setupRepeatingJobs().then(() => {
  logger.info('Worker is running with autonomous enrichment engine...');
});
