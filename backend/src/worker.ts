import { Worker, Job, Queue } from 'bullmq';
import { redis } from './clients/redis.js';
import { logger } from './config/logger.js';
import env from './config/env.js';
import { StaleIngestLockedError, withStaleIngestLock } from './services/ingestLock.js';

logger.info('=== KidSpot London - Background Worker ===');
logger.info(`Connected to Redis at: ${env.REDIS_URL}`);

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

const discoveryQueue = new Queue('discovery', { connection: redis });

const jobOpts = {
  removeOnComplete: { count: 10 },
  removeOnFail: { count: 20 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 30000 },
};

async function setupRepeatingJobs() {
  try {
    await discoveryQueue.add('enrich-geocode', { batchSize: 200 }, {
      repeat: { pattern: '0 */4 * * *' },
      jobId: 'repeat:enrich-geocode',
      ...jobOpts,
    });

    await discoveryQueue.add('enrich-osm-contacts', { batchSize: 200 }, {
      repeat: { pattern: '30 */6 * * *' },
      jobId: 'repeat:enrich-osm-contacts',
      ...jobOpts,
    });

    await discoveryQueue.add('enrich-web-scrape', { batchSize: 30 }, {
      repeat: { pattern: '15 */8 * * *' },
      jobId: 'repeat:enrich-web-scrape',
      ...jobOpts,
    });

    // Layer 2b: Direct website crawl
    await discoveryQueue.add('enrich-direct-crawl', { batchSize: 100 }, {
      repeat: { pattern: '0 */4 * * *' },
      jobId: 'repeat:enrich-direct-crawl',
      ...jobOpts,
    });

    // Layer 1b: OSM opening hours
    await discoveryQueue.add('enrich-osm-hours', { batchSize: 100 }, {
      repeat: { pattern: '45 */6 * * *' },
      jobId: 'repeat:enrich-osm-hours',
      ...jobOpts,
    });

    await discoveryQueue.add('enrich-apify', { batchSize: 20 }, {
      repeat: { pattern: '0 3 * * *' },
      jobId: 'repeat:enrich-apify',
      ...jobOpts,
    });

    await discoveryQueue.add('enrich-foursquare', { batchSize: 50 }, {
      repeat: { pattern: '0 5 * * *' },
      jobId: 'repeat:enrich-foursquare',
      ...jobOpts,
    });

    await discoveryQueue.add('enrich-geoapify', { batchSize: 40 }, {
      repeat: { pattern: '0 6 * * *' },
      jobId: 'repeat:enrich-geoapify',
      ...jobOpts,
    });

    await discoveryQueue.add('dedup-sweep', { dryRun: false }, {
      repeat: { pattern: '0 5 * * 0' },
      jobId: 'repeat:dedup-sweep',
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    });

    await discoveryQueue.add('run-discovery', {}, {
      repeat: { pattern: '0 2 * * 1' },
      jobId: 'repeat:run-discovery',
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    });

    logger.info('Repeatable enrichment jobs registered successfully');
  } catch (err) {
    logger.error({ err }, 'Error setting up repeating jobs');
  }
}

const worker = new Worker(
  'discovery',
  async (job: Job) => {
    const startMs = Date.now();
    logger.info({ jobId: job.id, jobName: job.name, data: job.data }, 'Processing job...');

    try {
      switch (job.name) {
        case 'run-discovery': {
          const { runAllDiscovery } = await import('../scripts/discovery/run-discovery.js');
          await runAllDiscovery();
          break;
        }

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

        case 'enrich-geocode': {
          const { enrichMissingDetails } = await import('../scripts/discovery/sources/enrichment.js');
          const result = await enrichMissingDetails();
          logger.info({ result }, 'Geocoding enrichment complete');
          return { status: 'completed', ...result };
        }

        case 'enrich-osm-contacts': {
          const { enrichOsmContacts } = await import('../scripts/discovery/sources/osm-contact-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 200;
          const result = await enrichOsmContacts(batchSize);
          logger.info({ result }, 'OSM contact enrichment complete');
          return { status: 'completed', ...result };
        }

        case 'enrich-web-scrape': {
          const { enrichViaWebScraping } = await import('../scripts/discovery/sources/web-scraper-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 30;
          const result = await enrichViaWebScraping(batchSize);
          logger.info({ result }, 'Web scraper enrichment complete');
          return { status: 'completed', ...result };
        }

        case 'enrich-direct-crawl': {
          const { enrichViaDirectCrawl } = await import('../scripts/discovery/sources/direct-crawl-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 100;
          const result = await enrichViaDirectCrawl(batchSize);
          logger.info({ result }, 'Direct crawl enrichment complete');
          return { status: 'completed', ...result };
        }

        case 'enrich-osm-hours': {
          const { enrichOsmOpeningHours } = await import('../scripts/discovery/sources/osm-opening-hours-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 100;
          const result = await enrichOsmOpeningHours(batchSize);
          logger.info({ result }, 'OSM opening hours enrichment complete');
          return { status: 'completed', ...result };
        }

        case 'enrich-apify': {
          const { enrichViaApify } = await import('../scripts/discovery/sources/apify-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 20;
          const result = await enrichViaApify(batchSize);
          logger.info({ result }, 'Apify enrichment complete');
          return { status: 'completed', ...result };
        }

        case 'enrich-foursquare': {
          const { enrichViaFoursquare } = await import('../scripts/discovery/sources/foursquare-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 50;
          const result = await enrichViaFoursquare(batchSize);
          logger.info({ result }, 'Foursquare enrichment complete');
          return { status: 'completed', ...result };
        }

        case 'enrich-geoapify': {
          const { enrichViaGeoapify } = await import('../scripts/discovery/sources/geoapify-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 40;
          const result = await enrichViaGeoapify(batchSize);
          logger.info({ result }, 'Geoapify enrichment complete');
          return { status: 'completed', ...result };
        }

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
    concurrency: 1,
    stalledInterval: 30000,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Job completed successfully');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, 'Job failed');
});

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

setupRepeatingJobs().then(() => {
  logger.info('Worker is running with autonomous enrichment engine...');
});
