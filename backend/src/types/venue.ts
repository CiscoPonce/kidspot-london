export type VenueType = 'softplay' | 'community_hall' | 'leisure_centre' | 'library' | 'park' | 'museum' | 'cafe' | 'other';
export type SponsorTier = 'gold' | 'silver' | 'bronze';

export type VenueFacet =
  | 'soft_play'
  | 'trampoline'
  | 'party_room'
  | 'activity_session'
  | 'farm_venue'
  | 'museum_programme'
  | 'hall_hire'
  | 'outdoor_play'
  | 'cafe'
  | 'wheelchair_accessible'
  | 'parking';

export const FACET_LABELS: Record<VenueFacet, string> = {
  soft_play: 'Soft Play',
  trampoline: 'Trampoline Park',
  party_room: 'Party Room',
  activity_session: 'Activity Sessions',
  farm_venue: 'Farm Park',
  museum_programme: 'Museum Programme',
  hall_hire: 'Hall Hire',
  outdoor_play: 'Outdoor Play',
  cafe: 'Café',
  wheelchair_accessible: 'Wheelchair Accessible',
  parking: 'Parking',
};

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
  parent_facets?: VenueFacet[];
  
  // Guardrail fields
  editor_locked?: boolean;
  manual_source?: string | null;
  primary_label?: string | null;
}

export interface VenueProvenanceLog {
  id: number;
  venue_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  changed_by: string;
  reason: string | null;
  created_at: Date;
}

export interface VenueWithGuardrails extends Venue {
  editor_locked: boolean;
  manual_source: string | null;
  primary_label: string | null;
}

export interface ProvenanceChange {
  venue_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  changed_by: string;
  reason?: string;
}

export interface SearchQuery {
  lat?: number;
  lon?: number;
  radius_miles?: number;
  type?: VenueType;
  facets?: VenueFacet[];
  limit?: number;
  borough?: string;
  postcode?: string;
}

export interface FacetSearchQuery extends Omit<SearchQuery, 'type'> {
  facets?: VenueFacet[];
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
      facets?: VenueFacet[];
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

export interface FacetSearchResponse extends SearchResponse {
  meta: SearchResponse['meta'] & {
    search: SearchResponse['meta']['search'] & {
      facets: VenueFacet[];
    };
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
