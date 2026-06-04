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
  postcode?: string;
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
  fhrs_establishment_id?: number | null;
  borough?: string | null;
  london_borough?: string | null;
  venue_scope?: 'core' | 'secondary' | 'review' | 'excluded' | null;
}

export interface FhrsEstablishment {
  id: number;
  business_name: string;
  business_type: string;
  business_type_id: number;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  address_line4?: string;
  postcode?: string;
  rating_value?: string;
  rating_key?: string;
  rating_date?: string | Date;
  local_authority_name?: string;
  lat?: number;
  lon?: number;
  scores_hygiene?: number;
  scores_structural?: number;
  scores_confidence_in_management?: number;
  last_updated?: string | Date;
}

export interface FhrsMatchResult {
  fhrs_id: number;
  score: number;
  establishment: FhrsEstablishment;
  is_likely_match: boolean;
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
  /** When true, include parks (venue_scope=secondary). Default search is core party venues only. */
  include_parks?: boolean;
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
    /** Which venue_scope values this search returned (default: core only). */
    venue_scope_filter?: string[];
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

export interface BoroughCsvSource {
  id: number;
  borough_name: string;
  dataset_name: string;
  dataset_url: string;
  dataset_type: string;
  licence_name: string | null;
  licence_url: string | null;
  last_fetched_at: Date | null;
  last_imported_at: Date | null;
  record_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BoroughCsvRecord {
  id: number;
  borough_csv_source_id: number;
  external_id: string | null;
  name: string;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  venue_id: number | null;
  raw_data: any;
  imported_at: Date;
}

export interface ParsedCsvRecord {
  external_id?: string;
  name: string;
  address?: string;
  postcode?: string;
  lat?: number;
  lon?: number;
  raw: any;
}

export interface OpenActiveFeed {
  id: number;
  publisher_name: string;
  feed_url: string;
  feed_type: string;
  licence_name: string | null;
  licence_url: string | null;
  refresh_cadence: string;
  last_fetched_at: Date | null;
  last_imported_at: Date | null;
  session_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OpenActiveLocation {
  id: number;
  openactive_feed_id: number;
  external_id: string;
  name: string;
  description: string | null;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  url: string | null;
  venue_id: number | null;
  raw_data: any;
  imported_at: Date;
}

export interface OpenActiveSession {
  id: number;
  openactive_location_id: number;
  external_id: string;
  name: string;
  description: string | null;
  activity_type: string | null;
  age_range: string | null;
  start_date: Date | null;
  end_date: Date | null;
  schedule: string | null;
  price: string | null;
  booking_url: string | null;
  availability_status: string | null;
  raw_data: any;
  imported_at: Date;
}

export interface OperatorPartnership {
  id: number;
  operator_name: string;
  operator_type: string;
  partnership_type: string;
  data_source_url: string | null;
  data_source_type: string | null;
  licence_name: string | null;
  licence_url: string | null;
  contact_email: string | null;
  is_active: boolean;
  confidence_level: string;
  created_at: Date;
  updated_at: Date;
}

export interface OperatorCrawlLog {
  id: number;
  operator_partnership_id: number;
  crawl_url: string;
  tos_version: string | null;
  user_agent: string | null;
  crawl_status: string;
  venues_found: number;
  venues_imported: number;
  error_message: string | null;
  crawled_at: Date;
}

export interface OperatorVenue {
  id: number;
  operator_partnership_id: number;
  external_id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  website: string | null;
  listing_url: string | null;
  last_verified_at: Date | null;
  venue_id: number | null;
  raw_data: any;
  imported_at: Date;
}
