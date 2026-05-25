import axios from 'axios';
import env from '../config/env.js';
import { logger } from '../config/logger.js';

const FOURSQUARE_BASE_URL = 'https://places-api.foursquare.com';
const API_VERSION = '2025-06-17';

export interface FoursquarePlace {
  fsq_place_id: string;
  latitude: number;
  longitude: number;
  name: string;
  location?: {
    address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
    formatted_address?: string;
  };
  tel?: string;
  email?: string;
  website?: string;
  distance?: number;
  categories?: { name: string; short_name?: string }[];
  social_media?: Record<string, string>;
}

function foursquareHeaders() {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${env.FOURSQUARE_API_KEY}`,
    'X-Places-Api-Version': API_VERSION,
  };
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Score how well a Foursquare result matches a KidSpot venue (0–1).
 */
export function scorePlaceMatch(venueName: string, place: FoursquarePlace): number {
  const venue = normalizeName(venueName);
  const candidate = normalizeName(place.name);

  if (!venue || !candidate) return 0;

  if (venue === candidate) return 1;
  if (venue.includes(candidate) || candidate.includes(venue)) return 0.9;

  const venueWords = venue.split(' ').filter((w) => w.length > 2);
  const candidateWords = candidate.split(' ').filter((w) => w.length > 2);
  if (venueWords.length === 0 || candidateWords.length === 0) return 0;

  const overlap = venueWords.filter((w) =>
    candidateWords.some((cw) => cw.includes(w) || w.includes(cw))
  ).length;

  const wordScore = overlap / Math.max(venueWords.length, candidateWords.length);

  // Penalise distant results (distance is in metres from search)
  const distance = place.distance ?? 0;
  const distanceScore = distance <= 100 ? 1 : distance <= 250 ? 0.8 : distance <= 500 ? 0.5 : 0;

  return wordScore * 0.7 + distanceScore * 0.3;
}

export const foursquareService = {
  isConfigured(): boolean {
    return Boolean(env.FOURSQUARE_API_KEY);
  },

  /**
   * Search for places near coordinates (free-tier endpoint).
   */
  async searchPlaces(params: {
    query: string;
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
  }): Promise<FoursquarePlace[]> {
    if (!env.FOURSQUARE_API_KEY) {
      logger.warn('Foursquare API key not configured');
      return [];
    }

    try {
      const response = await axios.get(`${FOURSQUARE_BASE_URL}/places/search`, {
        params: {
          query: params.query,
          ll: `${params.latitude},${params.longitude}`,
          radius: params.radius ?? 500,
          limit: Math.min(params.limit ?? 5, 10),
        },
        headers: foursquareHeaders(),
        timeout: 15000,
      });

      return (response.data?.results ?? []) as FoursquarePlace[];
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      logger.error({ err: error, status, message, params }, 'Foursquare search failed');
      return [];
    }
  },

  /**
   * Fetch basic place details (free tier — tel, website, email).
   * Premium fields (hours, photos, rating) require paid credits.
   */
  async getPlaceDetails(fsqPlaceId: string): Promise<FoursquarePlace | null> {
    if (!env.FOURSQUARE_API_KEY) return null;

    try {
      const response = await axios.get(`${FOURSQUARE_BASE_URL}/places/${fsqPlaceId}`, {
        headers: foursquareHeaders(),
        timeout: 15000,
      });

      return response.data as FoursquarePlace;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      logger.error({ err: error, status, message, fsqPlaceId }, 'Foursquare details fetch failed');
      return null;
    }
  },

  /**
   * Find the best Foursquare match for a venue by name + coordinates.
   */
  async findBestMatch(params: {
    name: string;
    latitude: number;
    longitude: number;
    minScore?: number;
  }): Promise<{ place: FoursquarePlace; score: number } | null> {
    const results = await this.searchPlaces({
      query: params.name,
      latitude: params.latitude,
      longitude: params.longitude,
      radius: 500,
      limit: 5,
    });

    if (results.length === 0) return null;

    const minScore = params.minScore ?? 0.45;
    let best: { place: FoursquarePlace; score: number } | null = null;

    for (const place of results) {
      const score = scorePlaceMatch(params.name, place);
      if (score >= minScore && (!best || score > best.score)) {
        best = { place, score };
      }
    }

    return best;
  },
};
