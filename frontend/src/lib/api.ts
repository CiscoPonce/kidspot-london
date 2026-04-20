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
  opening_hours?: Record<string, string>;
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
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
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
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.error || 'Unknown API error');
  }

  return json.data;
}

export async function fetchVenues(
  lat: number,
  lon: number,
  radiusMiles: number,
  type?: string,
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
