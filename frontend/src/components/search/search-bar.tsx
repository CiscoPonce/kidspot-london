'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { LocationButton } from './location-button';
import { RadiusSlider } from './radius-slider';
import { useSearch } from '@/hooks/use-search';
import { geocodePostcode } from '@/hooks/use-location';

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
    if (onSearch) {
      onSearch(newLat, newLon, radius, venueType);
    }
  }, [setSearchLocation, setPostcode, onSearch, radius, venueType]);

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
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Postcode and Category input row */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={postcodeInput}
              onChange={(e) => setPostcodeInput(e.target.value)}
              placeholder="Enter postcode (e.g., SW1A 1AA)"
              className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-secondary-300 
                text-secondary-900 placeholder-secondary-400
                focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200
                min-h-[44px]"
              disabled={isGeocoding}
            />
            {isGeocoding && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          
          <div className="md:w-1/3">
            <select
              value={venueType || ''}
              onChange={(e) => handleTypeChange(e.target.value || null)}
              className="w-full px-4 py-3 rounded-lg border-2 border-secondary-300 
                text-secondary-900 bg-white
                focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200
                min-h-[44px]"
            >
              {VENUE_TYPES.map((type) => (
                <option key={type.value || 'all'} value={type.value || ''}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isGeocoding}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium
              hover:bg-primary-600 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed
              min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Location status or button */}
        <div className="py-2">
          {hasLocation ? (
            <div className="flex items-center justify-between px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-sm text-green-700">
                Location set ({lat?.toFixed(4)}, {lon?.toFixed(4)})
              </span>
              <button
                type="button"
                onClick={() => { setSearchLocation(0, 0); setPostcode(''); }}
                className="text-sm text-green-600 hover:text-green-800 underline"
              >
                Clear
              </button>
            </div>
          ) : (
            <LocationButton onLocationReceived={handleLocationReceived} />
          )}
        </div>

        {/* Radius slider */}
        <div className="px-2">
          <RadiusSlider value={radius} onChange={handleRadiusChange} />
        </div>
      </form>
    </div>
  );
}