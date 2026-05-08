import axios from 'axios';
import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';
import { FhrsEstablishment } from '../types/venue.js';

const FHRS_BASE_URL = 'https://api.ratings.food.gov.uk';

/**
 * FHRS API specific response establishment type
 */
interface FhrsApiResponseEstablishment {
  FHRSID: number;
  BusinessName: string;
  BusinessType: string;
  BusinessTypeId: number;
  AddressLine1: string;
  AddressLine2: string;
  AddressLine3: string;
  AddressLine4: string;
  PostCode: string;
  RatingValue: string;
  RatingKey: string;
  RatingDate: string;
  LocalAuthorityName: string;
  geocode?: {
    longitude: string;
    latitude: string;
  };
  scores?: {
    Hygiene: number;
    Structural: number;
    ConfidenceInManagement: number;
  };
}

/**
 * Map FHRS API response to internal FhrsEstablishment type
 */
function mapApiResponseToInternal(apiEst: FhrsApiResponseEstablishment): FhrsEstablishment {
  return {
    id: apiEst.FHRSID,
    business_name: apiEst.BusinessName,
    business_type: apiEst.BusinessType,
    business_type_id: apiEst.BusinessTypeId,
    address_line1: apiEst.AddressLine1,
    address_line2: apiEst.AddressLine2,
    address_line3: apiEst.AddressLine3,
    address_line4: apiEst.AddressLine4,
    postcode: apiEst.PostCode,
    rating_value: apiEst.RatingValue,
    rating_key: apiEst.RatingKey,
    rating_date: apiEst.RatingDate,
    local_authority_name: apiEst.LocalAuthorityName,
    lat: apiEst.geocode?.latitude ? parseFloat(apiEst.geocode.latitude) : undefined,
    lon: apiEst.geocode?.longitude ? parseFloat(apiEst.geocode.longitude) : undefined,
    scores_hygiene: apiEst.scores?.Hygiene,
    scores_structural: apiEst.scores?.Structural,
    scores_confidence_in_management: apiEst.scores?.ConfidenceInManagement,
    last_updated: new Date(),
  };
}

export const fhrsService = {
  /**
   * Search for establishments on FHRS API
   */
  async searchEstablishments(params: {
    name?: string;
    address?: string;
    postcode?: string;
    longitude?: number;
    latitude?: number;
    maxDistanceLimit?: number;
    pageSize?: number;
  }): Promise<FhrsEstablishment[]> {
    try {
      const response = await axios.get(`${FHRS_BASE_URL}/Establishments`, {
        params: {
          name: params.name,
          address: params.address,
          postCode: params.postcode,
          longitude: params.longitude,
          latitude: params.latitude,
          maxDistanceLimit: params.maxDistanceLimit,
          pageSize: params.pageSize || 10,
        },
        headers: {
          'x-api-version': '2',
          'Accept': 'application/json',
        },
      });

      const establishments = response.data.establishments || [];
      return establishments.map(mapApiResponseToInternal);
    } catch (error: any) {
      logger.error({ err: error, params }, 'FHRS search failed');
      return [];
    }
  },

  /**
   * Get establishment details by FHRS ID
   */
  async getEstablishment(id: number): Promise<FhrsEstablishment | null> {
    try {
      const response = await axios.get(`${FHRS_BASE_URL}/Establishments/${id}`, {
        headers: {
          'x-api-version': '2',
          'Accept': 'application/json',
        },
      });

      return mapApiResponseToInternal(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error({ err: error, id }, 'FHRS details fetch failed');
      return null;
    }
  },

  /**
   * Calculate name similarity score between two strings
   */
  calculateSimilarity(name1: string, name2: string): number {
    const s1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const s2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) {
        const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
        return 0.7 + (ratio * 0.2);
    }
    
    const getGrams = (s: string) => {
        const grams = new Set();
        for (let i = 0; i < s.length - 1; i++) {
            grams.add(s.substring(i, i + 2));
        }
        return grams;
    };
    
    const grams1 = getGrams(s1);
    const grams2 = getGrams(s2);
    
    if (grams1.size === 0 || grams2.size === 0) return 0;
    
    const intersection = new Set([...grams1].filter(x => grams2.has(x)));
    const union = new Set([...grams1, ...grams2]);
    
    return intersection.size / union.size;
  },

  /**
   * Check if an FHRS establishment is relevant for the party portal
   */
  async isRelevant(businessType: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT is_party_relevant FROM fhrs_business_type_allowlist WHERE business_type = $1',
        [businessType]
      );
      
      if (result.rows.length === 0) {
          return false;
      }
      
      return result.rows[0].is_party_relevant;
    } catch (error) {
      logger.error({ err: error, businessType }, 'Error checking FHRS type relevance');
      return false;
    }
  },

  /**
   * Match FHRS establishment to a venue
   */
  async matchFhrsToVenue(venue: {
    name: string;
    postcode?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<FhrsEstablishment | null> {
    let establishments: FhrsEstablishment[] = [];
    
    if (venue.postcode) {
      establishments = await this.searchEstablishments({
        name: venue.name,
        postcode: venue.postcode,
      });
    }

    if (establishments.length === 0 && venue.latitude && venue.longitude) {
      establishments = await this.searchEstablishments({
        name: venue.name,
        latitude: venue.latitude,
        longitude: venue.longitude,
        maxDistanceLimit: 1,
      });
    }

    if (establishments.length === 0) return null;

    const scoredMatches = await Promise.all(establishments.map(async (est) => {
      const nameSimilarity = this.calculateSimilarity(venue.name, est.business_name);
      const isRelevant = await this.isRelevant(est.business_type);
      
      return {
        est,
        score: nameSimilarity,
        isRelevant
      };
    }));

    const bestMatch = scoredMatches
      .filter(m => m.isRelevant && m.score > 0.7)
      .sort((a, b) => b.score - a.score)[0];

    return bestMatch ? bestMatch.est : null;
  }
};
