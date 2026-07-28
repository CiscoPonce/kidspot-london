import express, { Request, Response } from 'express';
import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * Prometheus-compatible metrics endpoint
 * Serves platform telemetry for Grafana / Prometheus scraping.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_total,
        COUNT(*) FILTER (WHERE is_active = TRUE AND venue_scope = 'core') as core_total,
        COUNT(*) FILTER (WHERE is_active = TRUE AND party_capable = TRUE) as party_capable_total,
        COUNT(*) FILTER (WHERE is_active = TRUE AND (party_price_from IS NOT NULL OR party_packages IS NOT NULL)) as party_data_total
      FROM venues;
    `);

    const stats = rows[0];
    const memory = process.memoryUsage();
    const uptimeSeconds = process.uptime();

    const prometheusMetrics = [
      '# HELP kidspot_venues_active_total Total active venues in Greater London',
      '# TYPE kidspot_venues_active_total gauge',
      `kidspot_venues_active_total ${stats.active_total || 0}`,
      '',
      '# HELP kidspot_venues_core_total Total active core party venues',
      '# TYPE kidspot_venues_core_total gauge',
      `kidspot_venues_core_total ${stats.core_total || 0}`,
      '',
      '# HELP kidspot_venues_party_capable_total Confirmed party-capable venues',
      '# TYPE kidspot_venues_party_capable_total gauge',
      `kidspot_venues_party_capable_total ${stats.party_capable_total || 0}`,
      '',
      '# HELP kidspot_venues_party_data_total Venues with party pricing or packages',
      '# TYPE kidspot_venues_party_data_total gauge',
      `kidspot_venues_party_data_total ${stats.party_data_total || 0}`,
      '',
      '# HELP process_uptime_seconds Node process uptime in seconds',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${uptimeSeconds.toFixed(2)}`,
      '',
      '# HELP process_heap_bytes Node process heap memory usage in bytes',
      '# TYPE process_heap_bytes gauge',
      `process_heap_bytes ${memory.heapUsed}`,
      ''
    ].join('\n');

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error({ err: error }, 'Error generating Prometheus metrics');
    res.status(500).send('# ERROR: Failed to collect metrics\n');
  }
});

export default router;
