import env from '../config/env.js';
import { logger } from '../config/logger.js';

interface GooglePlaceMatch {
  placeId: string;
  website?: string;
  phone?: string;
  photos?: string[];
  businessStatus?: string;
}

interface GooglePlaceTextSearchResult {
  placeId: string;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lon?: number;
  photos?: string[];
  businessStatus?: string;
  types?: string[];
}

class GooglePlacesService {
  private readonly baseUrl = 'https://places.googleapis.com/v1/places';
  
  constructor() {
    if (!env.GOOGLE_PLACES_API_KEY) {
      logger.warn('GOOGLE_PLACES_API_KEY is not set. Google Places Service will not function.');
    }
  }

  /**
   * Search for a place by text query, biased by location.
   */
  async findPlace(name: string, lat: number, lon: number): Promise<GooglePlaceMatch | null> {
    if (!env.GOOGLE_PLACES_API_KEY) return null;

    try {
      // 1. Text Search to find the Place ID
      const searchResponse = await fetch(`${this.baseUrl}:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.websiteUri,places.nationalPhoneNumber,places.photos,places.businessStatus'
        },
        body: JSON.stringify({
          textQuery: name,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lon },
              radius: 1000.0 // 1km radius bias
            }
          }
        })
      });

      if (!searchResponse.ok) {
        if (searchResponse.status === 429) {
          logger.warn('Google Places API rate limit exceeded');
          throw new Error('RateLimitError: 429 Too Many Requests');
        }
        logger.error(`Google Places Search failed with status ${searchResponse.status}`);
        return null;
      }

      const searchData = await searchResponse.json() as any;
      
      if (!searchData.places || searchData.places.length === 0) {
        return null; // No match found
      }

      const place = searchData.places[0];
      
      const photos = place.photos 
        ? place.photos.map((p: any) => p.name).slice(0, 5) // Store photo references
        : [];

      return {
        placeId: place.id,
        website: place.websiteUri,
        phone: place.nationalPhoneNumber,
        photos,
        businessStatus: place.businessStatus
      };
      
    } catch (err) {
      logger.error({ err }, 'Error in Google Places Service');
      return null;
    }
  }

  /**
   * Text Search for places by query string, returning multiple results.
   */
  async textSearch(
    query: string,
    opts?: { type?: string; locationBias?: { lat: number; lon: number }; radius?: number; maxResults?: number }
  ): Promise<GooglePlaceTextSearchResult[]> {
    if (!env.GOOGLE_PLACES_API_KEY) return [];

    try {
      const maxResults = opts?.maxResults || 10;
      const body: Record<string, unknown> = { textQuery: query };

      if (opts?.locationBias) {
        body.locationBias = {
          circle: {
            center: { latitude: opts.locationBias.lat, longitude: opts.locationBias.lon },
            radius: (opts.radius || 50000.0)
          }
        };
      }

      const response = await fetch(`${this.baseUrl}:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.location,places.photos,places.businessStatus,places.types'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('Google Places Text Search rate limit exceeded');
          throw new Error('RateLimitError: 429 Too Many Requests');
        }
        logger.error(`Google Places Text Search failed with status ${response.status}`);
        return [];
      }

      const data = await response.json() as { places?: any[] };

      if (!data.places || data.places.length === 0) return [];

      return data.places.slice(0, maxResults).map((place: any) => ({
        placeId: place.id,
        name: place.displayName?.text || '',
        website: place.websiteUri,
        phone: place.nationalPhoneNumber,
        address: place.formattedAddress,
        lat: place.location?.latitude,
        lon: place.location?.longitude,
        photos: place.photos
          ? place.photos.map((p: any) => p.name).slice(0, 5)
          : [],
        businessStatus: place.businessStatus,
        types: place.types || []
      }));
    } catch (err) {
      logger.error({ err, query }, 'Error in Google Places Text Search');
      throw err;
    }
  }
}

export const googlePlacesService = new GooglePlacesService();
