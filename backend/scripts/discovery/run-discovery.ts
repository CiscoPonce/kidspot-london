import { discoverVenuesFromOSM } from './osm-discovery.js';
import { logger } from '../../src/config/logger.js';

export async function runAllDiscovery() {
  logger.info('=== KidSpot London - Venue Discovery ===');
  logger.info('This script discovers new venues from multiple sources.');
  
  const startTime = Date.now();
  
  try {
    // Yelp discovery disabled — Fusion API trial expired (2026-05)
    logger.info('--- OpenStreetMap Discovery ---');
    await discoverVenuesFromOSM();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.info({ durationSeconds: duration }, '=== All Discovery Complete ===');
    
  } catch (error: any) {
    logger.error({ err: error }, 'Fatal error during all discovery');
    throw error;
  }
}

import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  runAllDiscovery()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error({ err: error }, 'Fatal error');
      process.exit(1);
    });
}
