export type VenueType = 'softplay' | 'community_hall' | 'leisure_centre' | 'library' | 'park' | 'museum' | 'cafe' | 'other';
export type SponsorTier = 'gold' | 'silver' | 'bronze';

export interface Venue {
  id: number | string;
  name: string;
  lat: number | null;
  lon: number | null;
  type: string; // Keep as string for now to allow flexible ingestion, but use VenueType for validation
  source: string;
  source_id: string;
  slug: string;
  sponsor_tier: SponsorTier | null;
  sponsor_priority: number | null;
  distance_miles?: number | null;
  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
  
  // Optional metadata from fallback or enriched sources
  description?: string;
  website?: string;
  domain?: string;
  address?: string;
  phone?: string;
  rating?: number;
  user_ratings_total?: number;
  kid_score?: number;
  enriched_at?: string | Date;
  features?: string[];
}

export interface SearchQuery {
  lat?: number;
  lon?: number;
  radius_miles?: number;
  type?: VenueType;
  limit?: number;
  borough?: string;
  postcode?: string;
}

export interface SearchResponse {
  success: boolean;
  data: {
    total: number;
    sponsored: {
      count: number;
      venues: Venue[];
    };
    regular: {
      count: number;
      venues: Venue[];
    };
    all: Venue[];
  };
  meta: {
    search: {
      lat: number | null;
      lon: number | null;
      radius_miles: number;
      radius_meters: number;
      type: string | null;
      borough: string | null;
    };
    sponsor_info: {
      gold_count: number;
      silver_count: number;
      bronze_count: number;
    };
    cache_hit: boolean;
    fallback_source?: string | null;
    fallback_count?: number;
    fallback_triggered?: boolean;
  };
}

export interface VenueDetailsResponse {
  success: boolean;
  data: {
    basic: Venue;
    details: any; // Flexible for now as it comes from different APIs
  };
  meta: {
    cache_hit: boolean;
    is_fallback?: boolean;
  };
}
