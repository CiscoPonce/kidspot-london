import env from '../config/env.js';
import { logger } from '../config/logger.js';

interface GooglePlaceMatch {
  placeId: string;
  website?: string;
  phone?: string;
  photos?: string[];
  businessStatus?: string;
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
}

export const googlePlacesService = new GooglePlacesService();
