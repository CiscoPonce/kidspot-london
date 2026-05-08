'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { LocationButton } from './location-button';
import { RadiusSlider } from './radius-slider';
import { useSearch } from '@/hooks/use-search';
import { geocodePostcode } from '@/hooks/use-location';
import { usePlausible } from 'next-plausible';

interface SearchBarProps {
  onSearch?: (lat: number, lon: number, radius: number, type?: string | null, facets?: string[]) => void;
}

const FACET_OPTIONS = [
  { value: 'soft_play', label: 'Soft Play' },
  { value: 'party_room', label: 'Party Rooms' },
  { value: 'hall_hire', label: 'Hall Hire' },
  { value: 'activity_session', label: 'Activities' },
  { value: 'museum_programme', label: 'Museums' },
  { value: 'outdoor_play', label: 'Parks' },
  { value: 'library', label: 'Libraries' },
  { value: 'farm_venue', label: 'Farm Parks' },
  { value: 'trampoline', label: 'Trampoline' },
];

export function SearchBar({ onSearch }: SearchBarProps) {
  const [postcodeInput, setPostcodeInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [debouncedPostcode, setDebouncedPostcode] = useState('');
  const { lat, lon, radius, venueType, facets, setSearchLocation, setPostcode, setRadius, setVenueType, toggleFacet, clearFacets } = useSearch();
  const plausible = usePlausible();

  // Debounce postcode input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPostcode(postcodeInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [postcodeInput]);

  // Handle location received from button
  const handleLocationReceived = useCallback((newLat: number, newLon: number) => {
    setSearchLocation(newLat, newLon);
    setPostcode('');
    plausible('SearchPerformed', { 
      props: { type: venueType || 'all', radius, method: 'geolocation', facets: facets.join(',') } 
    });
    if (onSearch) {
      onSearch(newLat, newLon, radius, venueType, facets);
    }
  }, [setSearchLocation, setPostcode, onSearch, radius, venueType, facets, plausible]);

  // Handle search submission
  const handleSearch = async () => {
    if (!debouncedPostcode.trim()) {
      // If no postcode but we have location, just trigger search with current location/type
      if (lat && lon && onSearch) {
        onSearch(lat, lon, radius, venueType, facets);
      }
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodePostcode(debouncedPostcode);
      setSearchLocation(result.lat, result.lon);
      setPostcode(debouncedPostcode);
      plausible('SearchPerformed', { 
        props: { type: venueType || 'all', radius, method: 'postcode', facets: facets.join(',') } 
      });
      if (onSearch) {
        onSearch(result.lat, result.lon, radius, venueType, facets);
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle radius change
  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (lat && lon && onSearch) {
      onSearch(lat, lon, newRadius, venueType, facets);
    }
  };

  // Handle facet toggle
  const handleFacetToggle = (facet: string) => {
    toggleFacet(facet);
    // Note: Due to state batching, the facets in onSearch might be stale if we call it immediately
    // but the parent component usually listens to state changes or we trigger it manually
  };

  // Trigger search when facets change
  useEffect(() => {
    if (lat && lon && onSearch) {
      onSearch(lat, lon, radius, venueType, facets);
    }
  }, [facets, lat, lon, onSearch, radius, venueType]);

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  // Determine current location display
  const hasLocation = lat !== null && lon !== null;

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Postcode input row */}
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <input
              type="text"
              value={postcodeInput}
              onChange={(e) => setPostcodeInput(e.target.value)}
              placeholder="Postcode or Area..."
              aria-label="Postcode or area search"
              className="w-full px-5 py-4 pl-12 rounded-2xl bg-secondary/50 border border-white/10
                text-text-main placeholder-text-muted
                focus:bg-secondary/80 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10
                transition-all duration-300"
              disabled={isGeocoding}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
            {isGeocoding && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Facet Chips */}
        <div className="flex flex-wrap gap-2">
          {FACET_OPTIONS.map((option) => {
            const isActive = facets.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFacetToggle(option.value)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                    : 'bg-secondary/50 text-text-muted hover:bg-secondary border border-white/5'}`}
              >
                {option.label}
              </button>
            );
          })}
          {facets.length > 0 && (
            <button
              type="button"
              onClick={clearFacets}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-colors underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Location status or button */}
        <div className="pt-2">
...          {hasLocation ? (
            <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Location Synchronized
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setSearchLocation(0, 0); setPostcode(''); }}
                className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-colors"
              >
                Reset
              </button>
            </div>
          ) : (
            <LocationButton onLocationReceived={handleLocationReceived} />
          )}
        </div>

        {/* Radius slider */}
        <div className="pt-2">
          <RadiusSlider value={radius} onChange={handleRadiusChange} />
        </div>
      </form>
    </div>
  );
}