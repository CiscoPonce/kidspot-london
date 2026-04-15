const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Venue {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  source: string;
  distance_miles?: number;
  sponsor_tier?: string | null;
}

export interface VenueDetails {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  source: string;
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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

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
): Promise<Venue[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius_miles: radiusMiles.toString(),
    limit: limit.toString(),
  });

  if (type) {
    params.set('type', type);
  }

  return fetchApi<Venue[]>(`/search/venues?${params.toString()}`);
}

export async function getVenueDetails(
  venueId: number
): Promise<VenueDetails> {
  return fetchApi<VenueDetails>(`/search/venues/${venueId}/details`);
}
