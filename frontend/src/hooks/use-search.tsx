'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { usePlausible } from 'next-plausible';
import type { CateringFilter } from '@/lib/parent-filters';

export interface SearchState {
  lat: number | null;
  lon: number | null;
  radius: number;
  postcode: string;
  venueType: string | null;
  facets: string[];
  kidsCount: number | null;
  catering: CateringFilter;
}

interface SearchContextValue extends SearchState {
  setSearchLocation: (lat: number, lon: number) => void;
  setPostcode: (postcode: string) => void;
  setRadius: (radius: number) => void;
  setVenueType: (type: string | null) => void;
  setFacets: (facets: string[]) => void;
  toggleFacet: (facet: string) => void;
  clearFacets: () => void;
  setKidsCount: (count: number | null) => void;
  setCatering: (value: CateringFilter) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

const DEFAULT_RADIUS = 5;

export function SearchProvider({ children }: { children: ReactNode }) {
  const plausible = usePlausible();
  const [lat, setLat] = useState<number | null>(51.5074);
  const [lon, setLon] = useState<number | null>(-0.1278);
  const [radius, setRadiusState] = useState(DEFAULT_RADIUS);
  const [postcode, setPostcodeState] = useState('London');
  const [venueType, setVenueTypeState] = useState<string | null>(null);
  const [facets, setFacetsState] = useState<string[]>([]);
  const [kidsCount, setKidsCountState] = useState<number | null>(null);
  const [catering, setCateringState] = useState<CateringFilter>('any');

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

  const setKidsCount = useCallback((count: number | null) => {
    setKidsCountState(count);
  }, []);

  const setCatering = useCallback((value: CateringFilter) => {
    setCateringState(value);
  }, []);

  const clearSearch = useCallback(() => {
    setLat(null);
    setLon(null);
    setPostcodeState('');
    setRadiusState(DEFAULT_RADIUS);
    setVenueTypeState(null);
    setFacetsState([]);
    setKidsCountState(null);
    setCateringState('any');
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
        kidsCount,
        catering,
        setSearchLocation,
        setPostcode,
        setRadius,
        setVenueType,
        setFacets,
        toggleFacet,
        clearFacets,
        setKidsCount,
        setCatering,
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