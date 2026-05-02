import { Worker, Job } from 'bullmq';
import { redis } from './clients/redis.js';
import { logger } from './config/logger.js';
import env from './config/env.js';
import { StaleIngestLockedError, withStaleIngestLock } from './services/ingestLock.js';

logger.info('=== KidSpot London - Background Worker ===');
logger.info(`Connected to Redis at: ${env.REDIS_URL}`);

interface DiscoveryJobData {
  // Define expected job data structure here if needed
}

interface ProcessStaleJobData {
  limit?: number;
  dryRun?: boolean;
}

// Create a worker for the 'discovery' queue
const worker = new Worker(
  'discovery',
  async (job: Job<DiscoveryJobData | ProcessStaleJobData>) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Processing job...');

    try {
      if (job.name === 'run-discovery') {
        const { runAllDiscovery } = await import('../scripts/discovery/run-discovery.js');
        await runAllDiscovery();
      } else if (job.name === 'process-stale') {
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
      } else {
        logger.warn({ jobName: job.name }, 'Unknown job type');
      }
    } catch (error) {
      logger.error({ err: error, jobId: job.id }, 'Error processing job');
      throw error;
    }

    return { status: 'completed' };
  },
  {
    connection: redis,
    concurrency: 1,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed successfully');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job failed');
});

process.on('SIGTERM', async () => {
  logger.info('Worker shutting down (SIGTERM)...');
  await worker.close();
  process.exit(0);
});

logger.info('Worker is running and waiting for jobs...');
