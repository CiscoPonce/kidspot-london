import { Worker, Job } from 'bullmq';
import { redis } from './clients/redis.js';
import { logger } from './config/logger.js';
import env from './config/env.js';

logger.info('=== KidSpot London - Background Worker ===');
logger.info(`Connected to Redis at: ${env.REDIS_URL}`);

interface DiscoveryJobData {
  // Define expected job data structure here if needed
}

// Create a worker for the 'discovery' queue
const worker = new Worker('discovery', async (job: Job<DiscoveryJobData>) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Processing job...');
  
  try {
    if (job.name === 'run-discovery') {
      // Use dynamic import for the scripts to avoid pulling in JS into the TS bundle if not needed,
      // or just import normally if we plan to convert them soon.
      // For now, we'll use the .js files until they are converted.
      const { runAllDiscovery } = await import('../scripts/discovery/run-discovery.js');
      await runAllDiscovery();
    } else if (job.name === 'process-stale') {
      const { processStaleVenues } = await import('../scripts/cron-agent.js');
      await processStaleVenues();
    } else {
      logger.warn({ jobName: job.name }, 'Unknown job type');
    }
  } catch (error) {
    logger.error({ err: error, jobId: job.id }, 'Error processing job');
    throw error;
  }
  
  return { status: 'completed' };
}, { 
  connection: redis,
  concurrency: 1
});

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
