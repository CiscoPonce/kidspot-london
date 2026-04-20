'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { usePlausible } from 'next-plausible';

export interface SearchState {
  lat: number | null;
  lon: number | null;
  radius: number;
  postcode: string;
}

interface SearchContextValue extends SearchState {
  setSearchLocation: (lat: number, lon: number) => void;
  setPostcode: (postcode: string) => void;
  setRadius: (radius: number) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

const DEFAULT_RADIUS = 5;

export function SearchProvider({ children }: { children: ReactNode }) {
  const plausible = usePlausible();
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [radius, setRadiusState] = useState(DEFAULT_RADIUS);
  const [postcode, setPostcodeState] = useState('');

  const setSearchLocation = useCallback((newLat: number, newLon: number) => {
    setLat(newLat);
    setLon(newLon);
    plausible('Search', { props: { lat: newLat, lon: newLon } });
  }, [plausible]);

  const setPostcode = useCallback((newPostcode: string) => {
    setPostcodeState(newPostcode);
  }, []);

  const setRadius = useCallback((newRadius: number) => {
    setRadiusState(newRadius);
    plausible('RadiusChange', { props: { radius: newRadius } });
  }, [plausible]);

  const clearSearch = useCallback(() => {
    setLat(null);
    setLon(null);
    setPostcodeState('');
    setRadiusState(DEFAULT_RADIUS);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        lat,
        lon,
        radius,
        postcode,
        setSearchLocation,
        setPostcode,
        setRadius,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}