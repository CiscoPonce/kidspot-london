import { logger } from '../../../src/config/logger.js';
import { browserHeaders } from '../../../src/utils/httpHeaders.js';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

export async function fetchOverpassWithRetry(query: string, maxRetries = 4): Promise<any> {
  let attempt = 0;
  let delay = 3000;

  while (attempt < maxRetries) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...browserHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'data=' + encodeURIComponent(query),
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429 || response.status >= 500) {
        logger.warn(`Overpass ${endpoint} returned ${response.status} (attempt ${attempt + 1}/${maxRetries})`);
      } else {
        throw new Error(`Overpass API returned status ${response.status}`);
      }
    } catch (error: any) {
      if (attempt === maxRetries - 1) {
        logger.warn(`Overpass request failed: ${error.message}. Giving up this batch.`);
        return { elements: [] };
      }
      logger.warn(`Overpass request failed: ${error.message}. Retrying...`);
    }

    attempt++;
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 20000);
  }

  return { elements: [] };
}
