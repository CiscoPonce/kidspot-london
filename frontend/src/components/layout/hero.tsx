'use client';

import React, { useState } from 'react';
import { useSearch } from '@/hooks/use-search';
import { geocodePostcode } from '@/hooks/use-location';
import { usePlausible } from 'next-plausible';

export function SearchPill() {
  const [postcodeInput, setPostcodeInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { 
    lat, lon, radius, venueType, 
    setSearchLocation, setPostcode, setRadius, setVenueType 
  } = useSearch();
  const plausible = usePlausible();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcodeInput.trim()) return;

    setIsGeocoding(true);
    try {
      const result = await geocodePostcode(postcodeInput);
      setSearchLocation(result.lat, result.lon);
      setPostcode(postcodeInput);
      plausible('SearchPerformed', { 
        props: { type: venueType || 'all', radius, method: 'postcode_stacked' } 
      });
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest p-2 rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col gap-2 w-full">
      <form onSubmit={handleSearch} className="flex flex-col gap-2 w-full">
        {/* Search Input */}
        <div className="flex items-center bg-surface px-4 py-3 rounded-lg border border-outline-variant focus-within:border-primary-container focus-within:border-2 transition-colors">
          <span className="material-symbols-outlined text-outline mr-2">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 w-full text-body-md font-body-md text-on-surface outline-none" 
            placeholder="Search by location..." 
            type="text"
            value={postcodeInput}
            onChange={(e) => setPostcodeInput(e.target.value)}
            disabled={isGeocoding}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Category/Guests Placeholder */}
          <div className="flex-1 flex items-center bg-surface px-4 py-3 rounded-lg border border-outline-variant focus-within:border-primary-container focus-within:border-2 transition-colors">
            <span className="material-symbols-outlined text-outline mr-2">group</span>
            <select 
              className="bg-transparent border-none focus:ring-0 w-full text-body-md font-body-md text-on-surface outline-none cursor-pointer appearance-none"
              value={venueType || ''}
              onChange={(e) => setVenueType(e.target.value || null)}
            >
              <option value="">Any Category</option>
              <option value="softplay">Soft Play</option>
              <option value="park">Parks & Playgrounds</option>
              <option value="museum">Museums</option>
              <option value="library">Libraries</option>
              <option value="community_hall">Community Halls</option>
              <option value="leisure_centre">Leisure Centres</option>
              <option value="cafe">Child-friendly Cafes</option>
            </select>
          </div>
          
          <button 
            type="submit"
            disabled={isGeocoding}
            className="bg-primary-container text-on-primary-container font-title-sm text-title-sm px-6 rounded-lg active:scale-95 transition-transform h-[48px] flex items-center justify-center disabled:opacity-50"
          >
            {isGeocoding ? '...' : 'Search'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-[#c8b6ff] via-[#e7c6ff] to-[#ffd6a5] px-margin-mobile py-stack-lg min-h-[400px] flex flex-col justify-center items-center text-center overflow-hidden">
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>
      
      <div className="relative z-10 w-full max-w-lg mx-auto space-y-stack-md">
        <h1 className="font-display-lg text-display-lg text-on-background uppercase">
          FIND THE PERFECT PARTY SPACE
        </h1>
        
        <SearchPill />
      </div>
    </section>
  );
}
