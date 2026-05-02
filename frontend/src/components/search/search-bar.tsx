'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { LocationButton } from './location-button';
import { RadiusSlider } from './radius-slider';
import { useSearch } from '@/hooks/use-search';
import { geocodePostcode } from '@/hooks/use-location';
import { usePlausible } from 'next-plausible';

interface SearchBarProps {
  onSearch?: (lat: number, lon: number, radius: number, type?: string | null) => void;
}

const VENUE_TYPES = [
  { value: null, label: 'All Categories' },
  { value: 'softplay', label: 'Soft Play' },
  { value: 'park', label: 'Parks & Playgrounds' },
  { value: 'museum', label: 'Museums' },
  { value: 'library', label: 'Libraries' },
  { value: 'community_hall', label: 'Community Halls' },
  { value: 'leisure_centre', label: 'Leisure Centres' },
  { value: 'cafe', label: 'Child-friendly Cafes' },
  { value: 'other', label: 'Other' },
];

export function SearchBar({ onSearch }: SearchBarProps) {
  const [postcodeInput, setPostcodeInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [debouncedPostcode, setDebouncedPostcode] = useState('');
  const { lat, lon, radius, venueType, setSearchLocation, setPostcode, setRadius, setVenueType } = useSearch();
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
      props: { type: venueType || 'all', radius, method: 'geolocation' } 
    });
    if (onSearch) {
      onSearch(newLat, newLon, radius, venueType);
    }
  }, [setSearchLocation, setPostcode, onSearch, radius, venueType, plausible]);

  // Handle search submission
  const handleSearch = async () => {
    if (!debouncedPostcode.trim()) {
      // If no postcode but we have location, just trigger search with current location/type
      if (lat && lon && onSearch) {
        onSearch(lat, lon, radius, venueType);
      }
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodePostcode(debouncedPostcode);
      setSearchLocation(result.lat, result.lon);
      setPostcode(debouncedPostcode);
      plausible('SearchPerformed', { 
        props: { type: venueType || 'all', radius, method: 'postcode' } 
      });
      if (onSearch) {
        onSearch(result.lat, result.lon, radius, venueType);
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
      onSearch(lat, lon, newRadius, venueType);
    }
  };

  // Handle type change
  const handleTypeChange = (newType: string | null) => {
    setVenueType(newType);
    if (lat && lon && onSearch) {
      onSearch(lat, lon, radius, newType);
    }
  };

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
        {/* Postcode and Category input row */}
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
          
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <select
              value={venueType || ''}
              onChange={(e) => handleTypeChange(e.target.value || null)}
              aria-label="Select venue category"
              className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border border-white/10
                text-text-main appearance-none cursor-pointer
                focus:bg-secondary/80 focus:border-primary/50 focus:outline-none
                transition-all duration-300"
            >
              {VENUE_TYPES.map((type) => (
                <option key={type.value || 'all'} value={type.value || ''} className="bg-secondary text-text-main">
                  {type.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isGeocoding}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px]
                hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all duration-300"
            >
              Search
            </button>
          </div>
        </div>

        {/* Location status or button */}
        <div className="pt-2">
          {hasLocation ? (
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