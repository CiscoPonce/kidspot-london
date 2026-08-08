import { useState, useEffect, useCallback } from 'react';

export interface CurrentPosition {
  lat: number;
  lon: number;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName?: string;
}

export type PositionPermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

interface UseCurrentPositionResult {
  position: CurrentPosition | null;
  loading: boolean;
  error: string | null;
  permissionState: PositionPermissionState;
  requestLocation: () => void;
}

/**
 * Hook to get the user's current position using the Geolocation API.
 */
export function useCurrentPosition(): UseCurrentPositionResult {
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PositionPermissionState>('prompt');

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setPermissionState('unavailable');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLoading(false);
        setPermissionState('granted');
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied');
            setPermissionState('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information unavailable');
            setPermissionState('unavailable');
            break;
          case err.TIMEOUT:
            setError('Location request timed out');
            setPermissionState('unavailable');
            break;
          default:
            setError('Unknown error occurred');
            setPermissionState('unavailable');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  // Check initial permission state
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      return;
    }

    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      switch (result.state) {
        case 'granted':
          setPermissionState('granted');
          break;
        case 'denied':
          setPermissionState('denied');
          break;
        case 'prompt':
        default:
          setPermissionState('prompt');
      }
    }).catch(() => {
      // Permissions API not supported, assume prompt
      setPermissionState('prompt');
    });
  }, []);

  return { position, loading, error, permissionState, requestLocation };
}

/**
 * Geocode a UK postcode via postcodes.io (primary) or Photon (fallback).
 */
export async function geocodePostcode(postcode: string): Promise<GeocodeResult> {
  const cleaned = postcode.trim().toUpperCase();
  if (!cleaned) {
    throw new Error('Postcode is required');
  }

  const compact = cleaned.replace(/\s/g, '');
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i;
  if (!postcodeRegex.test(compact)) {
    throw new Error('Invalid postcode format — try e.g. E15 1GH');
  }

  const formatted = compact.replace(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/i, '$1 $2');

  // postcodes.io — accurate for UK
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(formatted)}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.result?.latitude != null && data.result?.longitude != null) {
        return {
          lat: data.result.latitude,
          lon: data.result.longitude,
          displayName: data.result.admin_ward || formatted,
        };
      }
    }
  } catch {
    // fall through to Photon
  }

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(formatted)}&limit=1&lang=en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.features?.length) {
    throw new Error('No results found for this postcode');
  }

  const feature = data.features[0];
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lon, displayName: feature.properties.display_name };
}

/**
 * Geocode a location query — UK postcode or place name in London.
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Enter a postcode or area');
  }

  const compact = trimmed.toUpperCase().replace(/\s/g, '');
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i;

  if (postcodeRegex.test(compact)) {
    return geocodePostcode(trimmed);
  }

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${trimmed}, London, UK`)}&limit=1&lang=en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Could not look up that location');
  }

  const data = await response.json();
  if (!data.features?.length) {
    throw new Error('No results found — try a UK postcode like E15 1GH');
  }

  const feature = data.features[0];
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lon, displayName: feature.properties.name || trimmed };
}