    // Deduplication sweep — weekly on Sunday at 05:00 UTC
    await discoveryQueue.add('dedup-sweep', { dryRun: false }, {
      repeat: { pattern: '0 5 * * 0' }, // Sunday at 05:00
      jobId: 'repeat:dedup-sweep',
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    });

    // Full discovery run — weekly on Monday at 02:00 UTC
    await discoveryQueue.add('run-discovery', {}, {
      repeat: { pattern: '0 2 * * 1' }, // Monday at 02:00
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

        // Yelp details — DISABLED (trial expired)

        // ── Layer 3.6: Foursquare enrichment ──
        case 'enrich-foursquare': {
          const { enrichViaFoursquare } = await import('../scripts/discovery/sources/foursquare-enrichment.js');
          const batchSize = (job.data as EnrichmentJobData)?.batchSize || 50;
          const result = await enrichViaFoursquare(batchSize);
          logger.info({ result }, 'Foursquare enrichment complete');
          return { status: 'completed', ...result };
        }

        // Yelp grid — DISABLED (trial expired)


        // ── Deduplication sweep ──

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
    concurrency: 1, // Run one job at a time to avoid API rate limit conflicts
    stalledInterval: 30000,
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
