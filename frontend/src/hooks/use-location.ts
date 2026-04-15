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
 * Geocode a postcode using the Photon API.
 * Returns coordinates for the first result in the London area.
 */
export async function geocodePostcode(postcode: string): Promise<GeocodeResult> {
  const cleanedPostcode = postcode.trim().toUpperCase();
  
  if (!cleanedPostcode) {
    throw new Error('Postcode is required');
  }

  // Basic UK postcode validation
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  if (!postcodeRegex.test(cleanedPostcode)) {
    throw new Error('Invalid postcode format');
  }

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanedPostcode)}&limit=1&lang=en`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Photon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('No results found for this postcode');
    }

    const feature = data.features[0];
    const [lon, lat] = feature.geometry.coordinates;

    return {
      lat,
      lon,
      displayName: feature.properties.display_name,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to geocode postcode');
  }
}