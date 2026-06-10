import axios from 'axios';
import { logger } from '../config/logger.js';
import { braveSearchLimiter } from '../middleware/rateLimit.js';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_BASE_URL = 'https://api.search.brave.com/res/v1';

export interface BraveImage {
  title: string;
  url: string;
  source: string;
  thumbnail: {
    src: string;
  };
  properties?: {
    placeholder?: string;
  };
}

export const braveService = {
  /**
   * Search for images related to a venue
   */
  async searchImages(query: string, count: number = 5): Promise<string[]> {
    if (!BRAVE_API_KEY) {
      logger.info('Brave Image search skipped: BRAVE_API_KEY not configured');
      return [];
    }

    try {
      await braveSearchLimiter();

      const response = await axios.get(`${BRAVE_BASE_URL}/images/search`, {
        params: {
          q: query,
          count: Math.min(count, 20),
          safesearch: 'strict'
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY
        },
        timeout: 10000
      });

      if (response.status === 429) {
        logger.warn('Brave Search rate limit exceeded during image search');
        throw new Error('RateLimitError: 429 Too Many Requests');
      }

      const results = response.data?.results || [];
      
      // Filter out low-quality or irrelevant sources if needed
      // For now, just return the direct image URLs
      return results
        .map((r: any) => r.properties?.url || r.url)
        .filter((url: string) => url && url.startsWith('http'));
    } catch (error: any) {
      logger.error({ err: error.message, query }, 'Brave Image search error');
      return [];
    }
  }
};
