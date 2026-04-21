const { Worker } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

console.log('=== KidSpot London - Background Worker ===');
console.log(`Connected to Redis at: ${REDIS_URL}`);

// Create a worker for the 'discovery' queue
const worker = new Worker('discovery', async (job) => {
  console.log(`Processing job ${job.id} of type ${job.name}...`);
  
  try {
    if (job.name === 'run-discovery') {
      const { runAllDiscovery } = require('../scripts/discovery/run-discovery');
      await runAllDiscovery();
    } else if (job.name === 'process-stale') {
      const { processStaleVenues } = require('../scripts/cron-agent');
      await processStaleVenues();
    } else {
      console.warn(`Unknown job type: ${job.name}`);
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
  
  return { status: 'completed' };
}, { 
  connection,
  concurrency: 1
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with ${err.message}`);
});

process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  await worker.close();
  process.exit(0);
});

console.log('Worker is running and waiting for jobs...');
