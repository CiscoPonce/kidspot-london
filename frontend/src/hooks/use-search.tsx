'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { usePlausible } from 'next-plausible';

export interface SearchState {
  lat: number | null;
  lon: number | null;
  radius: number;
  postcode: string;
  venueType: string | null;
  facets: string[];
}

interface SearchContextValue extends SearchState {
  setSearchLocation: (lat: number, lon: number) => void;
  setPostcode: (postcode: string) => void;
  setRadius: (radius: number) => void;
  setVenueType: (type: string | null) => void;
  setFacets: (facets: string[]) => void;
  toggleFacet: (facet: string) => void;
  clearFacets: () => void;
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
  const [venueType, setVenueTypeState] = useState<string | null>(null);
  const [facets, setFacetsState] = useState<string[]>([]);

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

  const setVenueType = useCallback((newType: string | null) => {
    setVenueTypeState(newType);
    plausible('TypeChange', { props: { type: newType } });
  }, [plausible]);

  const setFacets = useCallback((newFacets: string[]) => {
    setFacetsState(newFacets);
    plausible('FacetsChange', { props: { facets: newFacets.join(',') } });
  }, [plausible]);

  const toggleFacet = useCallback((facet: string) => {
    setFacetsState(prev => {
      const next = prev.includes(facet)
        ? prev.filter(f => f !== facet)
        : [...prev, facet];
      plausible('FacetToggle', { props: { facet, active: next.includes(facet) } });
      return next;
    });
  }, [plausible]);

  const clearFacets = useCallback(() => {
    setFacetsState([]);
  }, []);

  const clearSearch = useCallback(() => {
    setLat(null);
    setLon(null);
    setPostcodeState('');
    setRadiusState(DEFAULT_RADIUS);
    setVenueTypeState(null);
    setFacetsState([]);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        lat,
        lon,
        radius,
        postcode,
        venueType,
        facets,
        setSearchLocation,
        setPostcode,
        setRadius,
        setVenueType,
        setFacets,
        toggleFacet,
        clearFacets,
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