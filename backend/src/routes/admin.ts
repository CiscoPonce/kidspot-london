import express from 'express';
import { randomUUID } from 'crypto';
import { verifyHmac } from '../middleware/hmac.js';
import { logger } from '../config/logger.js';
import { StaleIngestLockedError, withStaleIngestLock } from '../services/ingestLock.js';
// @ts-ignore — CommonJS module (no types)
import { processStaleVenues } from '../../scripts/cron-agent.js';
// @ts-ignore
import { processPartyVenues } from '../../scripts/discovery/party-venues-discovery.js';
// @ts-ignore
import { processVenueExpansion } from '../../scripts/discovery/venue-expansion.js';
// @ts-ignore
import { processEnrichment } from '../../scripts/discovery/data-enrichment.js';

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

router.post('/ingest/parties', verifyHmac, async (req, res) => {
  const jobId = randomUUID();
  const { dryRun } = parseIngestBody(req.body);

  try {
    const metrics = await withStaleIngestLock(() =>
      processPartyVenues(dryRun),
    );
    res.status(200).json({
      success: true,
      job_id: jobId,
      ...metrics
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
    logger.error({ err: error }, 'Error processing party venues');
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing party venues',
      job_id: jobId,
    });
  }
});

router.post('/ingest/expansion', verifyHmac, async (req, res) => {
  const jobId = randomUUID();
  const { dryRun } = parseIngestBody(req.body);

  try {
    const metrics = await withStaleIngestLock(() =>
      processVenueExpansion(dryRun),
    );
    res.status(200).json({
      success: true,
      job_id: jobId,
      ...metrics
    });
  } catch (error: unknown) {
    if (error instanceof StaleIngestLockedError) {
      return res.status(409).json({
        success: false,
        error: 'ingest_already_running',
        message: (error as Error).message,
        job_id: jobId,
      });
    }
    logger.error({ err: error }, 'Error processing venue expansion');
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing venue expansion',
      job_id: jobId,
    });
  }
});

router.post('/ingest/enrichment', verifyHmac, async (req, res) => {
  const jobId = randomUUID();
  const { dryRun } = parseIngestBody(req.body);

  try {
    const metrics = await withStaleIngestLock(() =>
      processEnrichment(dryRun),
    );
    res.status(200).json({
      success: true,
      job_id: jobId,
      ...metrics
    });
  } catch (error: unknown) {
    if (error instanceof StaleIngestLockedError) {
      return res.status(409).json({
        success: false,
        error: 'ingest_already_running',
        message: (error as Error).message,
        job_id: jobId,
      });
    }
    logger.error({ err: error }, 'Error processing data enrichment');
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing data enrichment',
      job_id: jobId,
    });
  }
});

router.get('/enrichment-stats', verifyHmac, async (_req, res) => {
  try {
    const { db } = await import('../clients/db.js');
    const { rows } = await db.query(`
      SELECT
        COUNT(*) AS total_active,
        COUNT(*) FILTER (WHERE website IS NOT NULL AND website != '') AS has_website,
        COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') AS has_phone,
        COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') AS has_email,
        COUNT(*) FILTER (WHERE booking_url IS NOT NULL AND booking_url != '') AS has_booking_url,
        COUNT(*) FILTER (WHERE address IS NOT NULL AND address != '') AS has_address,
        COUNT(*) FILTER (WHERE postcode IS NOT NULL AND postcode != '') AS has_postcode,
        COUNT(*) FILTER (WHERE borough IS NOT NULL AND borough != '') AS has_borough,
        COUNT(*) FILTER (WHERE opening_hours IS NOT NULL) AS has_opening_hours,
        COUNT(*) FILTER (WHERE images IS NOT NULL AND array_length(images, 1) > 0) AS has_images,
        COUNT(*) FILTER (WHERE contact_enriched_at IS NOT NULL) AS contact_enriched,
        COUNT(*) FILTER (WHERE enriched_at IS NOT NULL) AS geo_enriched
      FROM venues WHERE is_active = TRUE
    `);
    const stats = rows[0];
    const total = parseInt(stats.total_active);
    const pct = (n: string) => total > 0 ? ((parseInt(n) / total) * 100).toFixed(1) : '0';

    res.json({
      success: true,
      data: {
        total_active: total,
        coverage: {
          website: { count: parseInt(stats.has_website), pct: pct(stats.has_website) },
          phone: { count: parseInt(stats.has_phone), pct: pct(stats.has_phone) },
          email: { count: parseInt(stats.has_email), pct: pct(stats.has_email) },
          booking_url: { count: parseInt(stats.has_booking_url), pct: pct(stats.has_booking_url) },
          address: { count: parseInt(stats.has_address), pct: pct(stats.has_address) },
          postcode: { count: parseInt(stats.has_postcode), pct: pct(stats.has_postcode) },
          borough: { count: parseInt(stats.has_borough), pct: pct(stats.has_borough) },
          opening_hours: { count: parseInt(stats.has_opening_hours), pct: pct(stats.has_opening_hours) },
          images: { count: parseInt(stats.has_images), pct: pct(stats.has_images) },
        },
        enrichment_progress: {
          contact_enriched: parseInt(stats.contact_enriched),
          geo_enriched: parseInt(stats.geo_enriched),
          apify_enriched: parseInt(stats.has_opening_hours), // Using opening_hours as proxy for Apify
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching enrichment stats');
    res.status(500).json({ success: false, error: 'Failed to fetch enrichment stats' });
  }
});

export default router;

