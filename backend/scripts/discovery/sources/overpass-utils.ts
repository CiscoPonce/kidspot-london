import { logger } from '../../../src/config/logger.js';

export async function fetchOverpassWithRetry(query: string, maxRetries = 3): Promise<any> {
  let attempt = 0;
  let delay = 2000;

  while (attempt < maxRetries) {
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'KidSpot-London/1.0 (overpass-utils)'
        },
        body: 'data=' + encodeURIComponent(query)
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429 || response.status >= 500) {
        logger.warn(`Overpass returned ${response.status} (attempt ${attempt + 1}/${maxRetries})`);
      } else {
        // Stop on client errors other than 429
        throw new Error(`Overpass API returned status ${response.status}`);
      }
    } catch (error: any) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      logger.warn(`Overpass request failed: ${error.message}. Retrying...`);
    }

    attempt++;
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
  }
}
