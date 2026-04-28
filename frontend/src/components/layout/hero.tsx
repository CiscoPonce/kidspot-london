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
  { value: 'library', label: 'Libraries' },
  { value: 'community_hall', label: 'Community halls' },
  { value: 'leisure_centre', label: 'Leisure centres' },
  { value: 'cafe', label: 'Child-friendly cafes' },
];

function SearchPill() {
  const [postcodeInput, setPostcodeInput] = useState('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-2 shadow-[0_12px_40px_rgba(29,28,16,0.10)] flex flex-col gap-2 w-full"
    >
      <div className="flex flex-col md:flex-row gap-2">
        <label className="flex-1 flex items-center bg-surface px-4 py-3 rounded-2xl border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container transition">
          <span className="material-symbols-outlined text-outline mr-2 text-[22px]">
            location_on
          </span>
          <input
            type="text"
            value={postcodeInput}
            onChange={(e) => {
              setPostcodeInput(e.target.value);
              setError(null);
            }}
            placeholder="Enter a postcode (e.g. SW1A 1AA)"
            className="bg-transparent w-full text-base text-on-surface placeholder:text-outline outline-none"
            disabled={isGeocoding}
            aria-label="Postcode"
          />
        </label>

        <label className="md:w-56 flex items-center bg-surface px-4 py-3 rounded-2xl border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container transition">
          <span className="material-symbols-outlined text-outline mr-2 text-[22px]">
            category
          </span>
          <select
            value={venueType ?? ''}
            onChange={(e) => setVenueType(e.target.value || null)}
            className="bg-transparent w-full text-base text-on-surface outline-none cursor-pointer appearance-none pr-2"
            aria-label="Venue category"
          >
            {VENUE_CATEGORIES.map((c) => (
              <option key={c.value || 'any'} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isGeocoding}
          className="bg-primary-container text-on-primary-container font-semibold rounded-2xl px-6 h-[52px] hover:brightness-95 active:scale-95 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]"
        >
          {isGeocoding ? (
            <span className="w-4 h-4 border-2 border-on-primary-container/40 border-t-on-primary-container rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[22px]">search</span>
          )}
          <span>Search</span>
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 px-2 py-1">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={locLoading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-tertiary disabled:opacity-60 transition"
        >
          <span className="material-symbols-outlined text-[18px]">
            {locLoading ? 'progress_activity' : 'my_location'}
          </span>
          {locLoading ? 'Locating…' : 'Use my current location'}
        </button>
        {error && (
          <span className="text-sm font-medium text-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-container/70 via-tertiary-container/40 to-surface" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.7),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(95,239,255,0.35),transparent_50%)]"
      />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-20 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-on-primary-container bg-primary-container/80 px-3 py-1.5 rounded-full mb-5">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          Curated for London families
        </span>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-on-background leading-[1.05]">
          Find brilliant places <br className="hidden sm:block" />
          <span className="text-tertiary">for kids in London</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-on-surface-variant max-w-xl mx-auto leading-relaxed">
          Soft play, parks, museums, libraries and party venues — all
          checked for safety, vibe, and how much fun your kids will have.
        </p>

        <div className="mt-8 sm:mt-10 max-w-2xl mx-auto">
          <SearchPill />
        </div>
      </div>
    </section>
  );
}
