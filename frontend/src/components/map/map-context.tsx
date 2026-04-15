'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

export interface MapContextValue {
  map: MapLibreMap | null;
  setMap: (map: MapLibreMap | null) => void;
  selectedVenueId: number | null;
  setSelectedVenueId: (id: number | null) => void;
}

const MapContext = createContext<MapContextValue | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);

  const handleSetMap = useCallback((newMap: MapLibreMap | null) => {
    setMap(newMap);
  }, []);

  const handleSetSelectedVenueId = useCallback((id: number | null) => {
    setSelectedVenueId(id);
  }, []);

  return (
    <MapContext.Provider
      value={{
        map,
        setMap: handleSetMap,
        selectedVenueId,
        setSelectedVenueId: handleSetSelectedVenueId,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext(): MapContextValue {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}
