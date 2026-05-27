const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Venue {
  id: number | string;
  name: string;
  type: string;
  lat: number | null;
  lon: number | null;
  slug: string;
  source: string;
  borough?: string;
  distance_miles?: number;
  sponsor_tier?: string | null;
  rating?: number;
  price_level?: number;
  user_ratings_total?: number;
  image_url?: string;
  address?: string;
  postcode?: string;
  phone?: string;
  website?: string;
  email?: string;
  booking_url?: string;
  description?: string;
  domain?: string;
  features?: string[];
  enriched_at?: string;
}

export interface YelpReview {
  id: string;
  url: string;
  text: string;
  rating: number;
  time_created: string;
  user: {
    id: string;
    profile_url: string;
    image_url: string;
    name: string;
  };
}

export interface VenueDetails {
  id: number | string;
  name: string;
  type: string;
  lat: number | null;
  lon: number | null;
  slug: string;
  source: string;
  borough?: string;
  address?: string;
  postcode?: string;
  phone?: string;
  website?: string;
  email?: string;
  booking_url?: string;
  description?: string;
  user_ratings_total?: number;
  opening_hours?: any;
  reviews?: YelpReview[];
  current_claim_status?: 'unclaimed' | 'pending' | 'verified' | 'rejected';
  claim_email?: string;
  sponsor_tier?: string | null;
  rating?: number;
  price_level?: number;
  image_url?: string;
  images?: string[];
  features?: string[];
  enriched_at?: string;
}

export interface VenueSearchParams {
  lat?: number;
  lon?: number;
  radiusMiles?: number;
  type?: string;
  facets?: string[];
  postcode?: string;
  borough?: string;
  limit?: number;
}

export interface VenueResponse {
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
      type: string | null;
      borough: string | null;
    };
    fallback_triggered?: boolean;
    fallback_source?: string | null;
    fallback_count?: number;
  };
}

export interface VenueDetailsResponse {
  success: boolean;
  data: {
    basic: Venue;
    details: any;
  };
  meta: {
    cache_hit: boolean;
    is_fallback?: boolean;
  };
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchVenues(
  lat: number,
  lon: number,
  radiusMiles: number,
  type?: string,
  postcode?: string,
  limit: number = 50,
  facets?: string[]
): Promise<VenueResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius_miles: radiusMiles.toString(),
    limit: limit.toString(),
  });

  if (type) params.set('type', type);
  if (postcode) params.set('postcode', postcode);

  // If facets are provided, use the facets search endpoint
  if (facets && facets.length > 0) {
    params.set('facets', facets.join(','));
    return fetchApi<VenueResponse>(`/search/facets/venues?${params.toString()}`);
  }

  return fetchApi<VenueResponse>(`/search/venues?${params.toString()}`);
}

export async function fetchVenuesByBorough(borough: string, type?: string): Promise<VenueResponse> {
  const params = new URLSearchParams({ borough });
  if (type) params.set('type', type);
  return fetchApi<VenueResponse>(`/search/venues?${params.toString()}`);
}

export async function fetchVenuesByType(type: string): Promise<VenueResponse> {
  const params = new URLSearchParams({ type });
  return fetchApi<VenueResponse>(`/search/venues?${params.toString()}`);
}

export async function fetchVenueDetails(slug: string): Promise<VenueDetailsResponse> {
  return fetchApi<VenueDetailsResponse>(`/search/venues/slug/${slug}/details`);
}

// Aliases for compatibility with some components
export const getVenueBySlug = fetchVenueDetails;
export const getVenueDetails = (id: string | number) => fetchApi<VenueDetailsResponse>(`/search/venues/${id}/details`);

export async function fetchAllSlugs(): Promise<any[]> {
  const response = await fetchApi<{ success: boolean; data: any[] }>('/search/slugs');
  return response.data;
}

export async function trackVenueClick(venueId: string | number, type: string = 'website'): Promise<void> {
  try {
    await fetchApi(`/search/venues/${venueId}/click`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  } catch (error) {
    // Fail silently in frontend tracking
    console.warn('Click tracking failed:', error);
  }
}
