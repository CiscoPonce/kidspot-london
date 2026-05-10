'use client';

import { useEffect, useState } from 'react';
import { useSearch } from '@/hooks/use-search';
import { geocodePostcode, useCurrentPosition } from '@/hooks/use-location';
import { usePlausible } from 'next-plausible';

const VENUE_CATEGORIES = [
  { value: '', label: 'Any category' },
  { value: 'softplay', label: 'Soft play' },
  { value: 'park', label: 'Parks & playgrounds' },
  { value: 'museum', label: 'Museums' },
  { value: 'community_hall', label: 'Party rooms' },
  { value: 'library', label: 'Libraries' },
];

const AGE_GROUPS = [
  { value: '', label: 'Any age' },
  { value: '0-2', label: 'Babies (0-2)' },
  { value: '3-5', label: 'Toddlers (3-5)' },
  { value: '6-12', label: 'Kids (6-12)' },
];

function SearchPill() {
  const [postcodeInput, setPostcodeInput] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { radius, venueType, setSearchLocation, setPostcode, setVenueType } =
    useSearch();
  const { loading: locLoading, requestLocation, position } = useCurrentPosition();
  const plausible = usePlausible();

  // Sync geolocation result into shared search state once it arrives.
  useEffect(() => {
    if (position) {
      setSearchLocation(position.lat, position.lon);
      setPostcode('');
      plausible('SearchPerformed', {
        props: { type: venueType || 'all', radius, method: 'geolocation' },
      });
    }
  }, [position]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!postcodeInput.trim()) {
      setError('Enter a postcode to start');
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodePostcode(postcodeInput);
      setSearchLocation(result.lat, result.lon);
      setPostcode(postcodeInput);
      plausible('SearchPerformed', {
        props: { type: venueType || 'all', radius, method: 'postcode' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that postcode');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseLocation = () => {
    setError(null);
    requestLocation();
  };

  return (
    <form
      onSubmit={handleSearch}
      className="bg-surface-container-lowest rounded-[2rem] p-2 shadow-xl border border-outline-variant flex flex-col gap-2 w-full max-w-4xl mx-auto"
    >
      <div className="flex flex-col md:flex-row gap-2">
        <label className="flex-1 flex items-center bg-surface hover:bg-surface-container-high border border-outline-variant focus-within:border-primary focus-within:bg-surface-container-highest px-5 py-3.5 rounded-full transition cursor-text group">
          <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition mr-3 text-[22px]">
            location_on
          </span>
          <input
            type="text"
            value={postcodeInput}
            onChange={(e) => {
              setPostcodeInput(e.target.value);
              setError(null);
            }}
            placeholder="Enter a postcode"
            className="bg-transparent w-full text-base text-on-background placeholder:text-on-surface-variant outline-none"
            disabled={isGeocoding}
            aria-label="Postcode"
          />
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locLoading}
            title="Use my location"
            className="ml-2 text-on-surface-variant hover:text-on-background transition p-1"
          >
            <span className="material-symbols-outlined text-[20px]">
              {locLoading ? 'progress_activity' : 'my_location'}
            </span>
          </button>
        </label>

        <label className="md:w-48 flex items-center bg-surface hover:bg-surface-container-high border border-outline-variant focus-within:border-primary focus-within:bg-surface-container-highest px-5 py-3.5 rounded-full transition cursor-pointer relative group">
          <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition mr-3 text-[22px]">
            category
          </span>
          <select
            value={venueType ?? ''}
            onChange={(e) => setVenueType(e.target.value || null)}
            className="bg-transparent w-full text-base text-on-background outline-none cursor-pointer appearance-none pr-6"
            aria-label="Venue category"
          >
            {VENUE_CATEGORIES.map((c) => (
              <option key={c.value || 'any'} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined text-outline absolute right-4 pointer-events-none">expand_more</span>
        </label>

        <label className="md:w-44 flex items-center bg-surface hover:bg-surface-container-high border border-outline-variant focus-within:border-primary focus-within:bg-surface-container-highest px-5 py-3.5 rounded-full transition cursor-pointer relative group">
          <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition mr-3 text-[22px]">
            child_care
          </span>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="bg-transparent w-full text-base text-on-background outline-none cursor-pointer appearance-none pr-6"
            aria-label="Age group"
          >
            {AGE_GROUPS.map((c) => (
              <option key={c.value || 'any'} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined text-outline absolute right-4 pointer-events-none">expand_more</span>
        </label>

        <button
          type="submit"
          disabled={isGeocoding}
          aria-busy={isGeocoding}
          aria-label={isGeocoding ? 'Searching...' : 'Search'}
          className="bg-primary-container text-on-primary-container font-bold rounded-full px-8 h-[56px] hover:brightness-95 hover:shadow-md active:scale-95 disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isGeocoding ? (
            <span className="w-4 h-4 border-2 border-on-primary-container/40 border-t-on-primary-container rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[22px] font-bold">search</span>
          )}
          <span>Search</span>
        </button>
      </div>

      <div aria-live="polite" className="px-4">
        {error && (
          <span className="text-sm font-medium text-[#ff6b6b]" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface">
      {/* Blurry Image Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-sm transform scale-105 opacity-100"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }} 
      />
      
      {/* Very light white wash so the dark text remains readable, but the image is totally clear */}
      <div className="absolute inset-0 bg-white/50" />
      
      {/* Gradient to smoothly fade the bottom into the next section */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold tracking-widest uppercase text-on-primary-container bg-primary-container border border-primary-fixed px-5 py-2.5 rounded-full mb-8 shadow-sm">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          Curated for London families
        </span>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-on-background leading-[1.05] mb-6">
          Find the perfect London <br className="hidden sm:block" />
          <span className="text-primary">kids' party venue</span> in seconds
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed mb-10">
          Soft play, parks, museums, libraries and party rooms — all
          checked for safety, vibe, and how much fun your kids will have.
        </p>

        <div className="mx-auto">
          <SearchPill />
        </div>
      </div>
    </section>
  );
}
