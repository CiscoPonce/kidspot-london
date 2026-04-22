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
        props: { type: venueType || 'all', radius, method: 'postcode_pill' } 
      });
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="bg-pure-white rounded-full p-2 flex flex-col sm:flex-row items-center shadow-lg w-full max-w-xl mx-auto border border-border-gray mt-8">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center w-full">
        <div className="flex-1 flex items-center px-4 w-full h-[touch-target-min]">
          <span className="material-symbols-outlined text-secondary-brand mr-2">search</span>
          <input 
            className="w-full border-none focus:ring-0 text-body-text font-body-text bg-transparent placeholder-secondary-brand outline-none" 
            placeholder="Where is the party?" 
            type="text"
            value={postcodeInput}
            onChange={(e) => setPostcodeInput(e.target.value)}
            disabled={isGeocoding}
          />
        </div>
        
        <div className="w-px h-8 bg-border-gray hidden sm:block mx-2"></div>
        
        <div className="flex-1 flex items-center px-4 w-full h-[touch-target-min]">
          <span className="material-symbols-outlined text-secondary-brand mr-2">group</span>
          <select 
            className="w-full border-none focus:ring-0 text-body-text font-body-text bg-transparent text-secondary-brand appearance-none outline-none cursor-pointer"
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
          className="bg-absolute-black text-pure-white font-button-label text-button-label px-button-x py-button-y h-[touch-target-min] w-full sm:w-auto uppercase hover:bg-renault-blue transition-colors duration-200 rounded-full sm:rounded-none mt-2 sm:mt-0 disabled:opacity-50"
        >
          {isGeocoding ? '...' : 'SEARCH'}
        </button>
      </form>
    </div>
  );
}

export function Hero() {
  return (
    <section className="aurora-gradient min-h-[530px] flex flex-col justify-center px-6 py-section-gap relative overflow-hidden">
      <div className="relative z-10 max-w-2xl mx-auto text-center w-full">
        <h2 className="font-hero-title text-hero-title text-pure-white mb-8 uppercase tracking-tighter">
          THE PERFECT PARTY SPACE
        </h2>
        
        <SearchPill />
      </div>
      
      {/* Abstract shapes or effects can go here */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-renault-yellow rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-renault-blue rounded-full blur-[120px]"></div>
      </div>
    </section>
  );
}
