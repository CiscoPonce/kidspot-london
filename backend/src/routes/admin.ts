import express from 'express';
import { randomUUID } from 'crypto';
import { verifyHmac } from '../middleware/hmac.js';
import { logger } from '../config/logger.js';
import { StaleIngestLockedError, withStaleIngestLock } from '../services/ingestLock.js';
// @ts-ignore — CommonJS module (no types)
import { processStaleVenues } from '../../scripts/cron-agent.js';

const router = express.Router();

function parseIngestBody(body: unknown): { limit: number; dryRun: boolean } {
  const defaults = { limit: 50, dryRun: false };
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return defaults;
  }
  const o = body as Record<string, unknown>;
  let limit = defaults.limit;
  if (typeof o.limit === 'number' && Number.isFinite(o.limit)) {
    limit = Math.min(Math.max(Math.floor(o.limit), 1), 500);
  }
  let dryRun = defaults.dryRun;
  if (typeof o.dry_run === 'boolean') {
    dryRun = o.dry_run;
  }
  if (typeof o.dryRun === 'boolean') {
    dryRun = o.dryRun;
  }
  return { limit, dryRun };
}

router.post('/ingest/stale', verifyHmac, async (req, res) => {
  const jobId = randomUUID();
  const { limit, dryRun } = parseIngestBody(req.body);

  try {
    const metrics = await withStaleIngestLock(() =>
      processStaleVenues({ limit, dryRun }),
    );
    res.status(200).json({
      success: true,
      job_id: jobId,
      processed: metrics.processed,
      updated: metrics.updated,
      deactivated: metrics.deactivated,
      failed: metrics.failed,
      skipped: metrics.skipped,
      sources: metrics.sources,
      duration_ms: metrics.duration_ms,
      dry_run: metrics.dry_run,
    });
  } catch (error: unknown) {
    if (error instanceof StaleIngestLockedError) {
      return res.status(409).json({
        success: false,
        error: 'ingest_already_running',
        message: error.message,
        job_id: jobId,
      });
    }
    logger.error({ err: error }, 'Error processing stale venues');
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing stale venues',
      job_id: jobId,
    });
  }
});

export default router;
