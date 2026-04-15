'use client';

import { useCallback } from 'react';
import { useMapContext } from '../components/map/map-context';
import type { Map as MapLibreMap, LngLatBoundsLike } from 'maplibre-gl';

export interface UseMapReturn {
  map: MapLibreMap | null;
  selectedVenueId: number | null;
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]], padding?: number) => void;
  getMapState: () => { zoom: number; center: { lat: number; lon: number } } | null;
  setSelectedVenue: (id: number | null) => void;
}

export function useMap(): UseMapReturn {
  const { map, selectedVenueId, setSelectedVenueId } = useMapContext();

  const flyTo = useCallback(
    (lat: number, lon: number, zoom?: number) => {
      if (!map) return;
      map.flyTo({
        center: [lon, lat],
        zoom: zoom ?? map.getZoom(),
        duration: 1000,
      });
    },
    [map]
  );

  const fitBounds = useCallback(
    (bounds: [[number, number], [number, number]], padding: number = 50) => {
      if (!map) return;
      map.fitBounds(bounds as LngLatBoundsLike, {
        padding: padding,
        duration: 1000,
      });
    },
    [map]
  );

  const getMapState = useCallback(() => {
    if (!map) return null;
    const center = map.getCenter();
    return {
      zoom: map.getZoom(),
      center: {
        lat: center.lat,
        lon: center.lng,
      },
    };
  }, [map]);

  const setSelectedVenue = useCallback(
    (id: number | null) => {
      setSelectedVenueId(id);
    },
    [setSelectedVenueId]
  );

  return {
    map,
    selectedVenueId,
    flyTo,
    fitBounds,
    getMapState,
    setSelectedVenue: setSelectedVenue,
  };
}
