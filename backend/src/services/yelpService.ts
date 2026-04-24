import axios from 'axios';
import env from '../config/env.js';
import { logger } from '../config/logger.js';

const YELP_BASE_URL = 'https://api.yelp.com/v3';

export interface YelpBusiness {
  id: string;
  name: string;
  image_url: string;
  is_closed: boolean;
  url: string;
  review_count: number;
  categories: { alias: string; title: string }[];
  rating: number;
  coordinates: { latitude: number; longitude: number };
  location: {
    address1: string;
    city: string;
    zip_code: string;
    country: string;
    display_address: string[];
  };
  phone: string;
  display_phone: string;
  hours?: {
    open: {
      is_overnight: boolean;
      start: string;
      end: string;
      day: number;
    }[];
    hours_type: string;
    is_open_now: boolean;
  }[];
  photos?: string[];
}

export const yelpService = {
  /**
   * Search for businesses on Yelp
   */
  async searchBusinesses(params: {
    term?: string;
    latitude?: number;
    longitude?: number;
    location?: string;
    radius?: number;
    categories?: string;
    limit?: number;
  }) {
    if (!env.YELP_API_KEY) {
      logger.warn('Yelp API key not configured');
      return [];
    }

    try {
      const response = await axios.get(`${YELP_BASE_URL}/businesses/search`, {
        params: {
          ...params,
          radius: params.radius ? Math.min(params.radius, 40000) : undefined, // Yelp max radius is 40km
        },
        headers: {
          Authorization: `Bearer ${env.YELP_API_KEY}`,
        },
      });

      return response.data.businesses as YelpBusiness[];
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        logger.warn({ params }, 'Yelp API rate limit reached (429)');
      } else {
        logger.error({ err: error.message || error, params }, 'Yelp search failed');
      }
      return [];
    }
  },

  /**
   * Get business details by Yelp ID
   */
  async getBusinessDetails(id: string) {
    if (!env.YELP_API_KEY) return null;

    try {
      const response = await axios.get(`${YELP_BASE_URL}/businesses/${id}`, {
        headers: {
          Authorization: `Bearer ${env.YELP_API_KEY}`,
        },
      });

      return response.data as YelpBusiness;
    } catch (error: any) {
      logger.error({ err: error, id }, 'Yelp details fetch failed');
      return null;
    }
  },

  /**
   * Find a Yelp business by matching its details (useful for existing Google venues)
   */
  async findBusinessMatch(params: {
    name: string;
    address1: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  }) {
    if (!env.YELP_API_KEY) return null;

    try {
      const response = await axios.get(`${YELP_BASE_URL}/businesses/matches`, {
        params: {
          ...params,
          match_threshold: 'default',
        },
        headers: {
          Authorization: `Bearer ${env.YELP_API_KEY}`,
        },
      });

      const matches = response.data.businesses;
      if (matches && matches.length > 0) {
        return matches[0] as { id: string; name: string };
      }
      return null;
    } catch (error: any) {
      logger.error({ err: error, params }, 'Yelp match failed');
      return null;
    }
  }
};
