const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Venue {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  slug: string;
  source: string;
  borough?: string;
  distance_miles?: number;
  sponsor_tier?: string | null;
  image_url?: string;
}

export interface VenueDetails {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  slug: string;
  source: string;
  borough?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: Record<string, string>;
  sponsor_tier?: string | null;
  image_url?: string;
}

export interface VenueSearchParams {
  lat: number;
  lon: number;
  radiusMiles: number;
  type?: string;
  limit?: number;
}

export interface VenueResponse {
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
  meta?: {
    fallback_triggered?: boolean;
    fallback_source?: string | null;
    fallback_count?: number;
    cache_hit?: boolean;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Ensure we don't have double slashes and that we include /api if it's missing from the base
  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const url = endpoint.startsWith('http') ? endpoint : `${cleanBase}/${cleanEndpoint}`;

  console.log(`[API] Fetching: ${url}`); // Added for easier debugging in browser console

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.error || 'Unknown API error');
  }

  // Merge meta into data if it's an object
  if (json.meta && typeof json.data === 'object' && json.data !== null) {
    (json.data as any).meta = json.meta;
  }

  return json.data;
}

export async function fetchVenues(
  lat: number,
  lon: number,
  radiusMiles: number,
  type?: string,
  postcode?: string,
  limit: number = 50
): Promise<VenueResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius_miles: radiusMiles.toString(),
    limit: limit.toString(),
  });

  if (type) {
    params.set('type', type);
  }
  if (postcode) {
    params.set('postcode', postcode);
  }

  return fetchApi<VenueResponse>(`/search/venues?${params.toString()}`);
}

export async function fetchVenuesByBorough(
  borough: string,
  type?: string,
  limit: number = 50
): Promise<VenueResponse> {
  const params = new URLSearchParams({
    borough,
    limit: limit.toString(),
  });

  if (type) {
    params.set('type', type);
  }

  return fetchApi<VenueResponse>(`/search/venues?${params.toString()}`);
}

export async function fetchVenuesByType(
  type: string,
  limit: number = 100
): Promise<VenueResponse> {
  const params = new URLSearchParams({
    type,
    limit: limit.toString(),
  });

  return fetchApi<VenueResponse>(`/search/venues?${params.toString()}`);
}

export async function getVenueDetails(
  venueId: number
): Promise<VenueDetails> {
  return fetchApi<VenueDetails>(`/search/venues/${venueId}/details`);
}

export async function getVenueBySlug(
  slug: string
): Promise<VenueDetails> {
  return fetchApi<VenueDetails>(`/search/venues/slug/${slug}/details`);
}

export async function fetchAllSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  return fetchApi<{ slug: string; updated_at: string }[]>('/search/slugs');
}
