import env from '../config/env.js';
import { logger } from '../config/logger.js';

interface GooglePlaceMatch {
  placeId: string;
  name?: string;
  lat?: number;
  lon?: number;
  website?: string;
  phone?: string;
  address?: string;
  photos?: string[];
  businessStatus?: string;
}

interface TextSearchOptions {
  maxResults?: number;
  locationBias?: { lat: number; lon: number };
  radius?: number;
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
          'X-Goog-FieldMask': 'places.id,places.websiteUri,places.nationalPhoneNumber,places.businessStatus'
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
   * Text search returning multiple place matches (for discovery sweeps).
   */
  async textSearch(query: string, options: TextSearchOptions = {}): Promise<GooglePlaceMatch[]> {
    if (!env.GOOGLE_PLACES_API_KEY) return [];

    const { maxResults = 10, locationBias, radius = 15000 } = options;

    try {
      const body: Record<string, unknown> = {
        textQuery: query,
        maxResultCount: Math.min(maxResults, 20),
      };

      if (locationBias) {
        body.locationBias = {
          circle: {
            center: { latitude: locationBias.lat, longitude: locationBias.lon },
            radius: radius,
          },
        };
      }

      const searchResponse = await fetch(`${this.baseUrl}:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.location,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.businessStatus',
        },
        body: JSON.stringify(body),
      });

      if (!searchResponse.ok) {
        const errBody = await searchResponse.text().catch(() => '');
        if (searchResponse.status === 429) {
          throw new Error('RateLimitError: 429 Too Many Requests');
        }
        logger.error({ status: searchResponse.status, errBody: errBody.slice(0, 300) }, 'Google Places textSearch failed');
        return [];
      }

      const searchData = (await searchResponse.json()) as { places?: Array<Record<string, unknown>> };
      if (!searchData.places?.length) return [];

      return searchData.places.map((place) => {
        const location = place.location as { latitude?: number; longitude?: number } | undefined;
        const displayName = place.displayName as { text?: string } | undefined;
        return {
          placeId: String(place.id ?? ''),
          name: displayName?.text,
          lat: location?.latitude,
          lon: location?.longitude,
          website: place.websiteUri as string | undefined,
          phone: place.nationalPhoneNumber as string | undefined,
          address: place.formattedAddress as string | undefined,
          businessStatus: place.businessStatus as string | undefined,
        };
      }).filter((p) => p.placeId && p.name);
    } catch (err) {
      logger.error({ err, query }, 'Error in Google Places textSearch');
      throw err;
    }
  }
}

export const googlePlacesService = new GooglePlacesService();
