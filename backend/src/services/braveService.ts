import axios from 'axios';
import { logger } from '../config/logger.js';
import { braveSearchLimiter } from '../middleware/rateLimit.js';
import { cleanAndRankImages } from '../utils/imageFilter.js';

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
          count: Math.min(Math.max(count * 3, 10), 20),
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
      const rawUrls: string[] = results
        .map((r: any) => r.properties?.url || r.url)
        .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);

      return cleanAndRankImages(rawUrls).slice(0, count);
    } catch (error: any) {
      if (
        error?.response?.status === 429 ||
        (typeof error?.message === 'string' && error.message.includes('RateLimitError: 429'))
      ) {
        logger.warn({ query }, 'Brave Search HTTP 429 rate limit exceeded');
        throw new Error('RateLimitError: 429 Too Many Requests');
      }
      logger.error({ err: error.message, query }, 'Brave Image search error');
      return [];
    }
  }
};
