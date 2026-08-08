'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearch } from '@/hooks/use-search';
import { geocodeLocation, useCurrentPosition } from '@/hooks/use-location';
import { useBooking } from '@/context/booking-context';

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface HeroSearchFormProps {
  variant: 'mobile' | 'desktop' | 'compact';
  onSearchComplete?: () => void;
}

export function HeroSearchForm({ variant, onSearchComplete }: HeroSearchFormProps) {
  const { postcode, setPostcode, setSearchLocation } = useSearch();
  const [locationQuery, setLocationQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loading: locLoading, requestLocation, position } = useCurrentPosition();
  const { updateBooking } = useBooking();

  useEffect(() => {
    if (postcode && postcode !== 'London') {
      setLocationQuery(postcode);
    }
  }, [postcode]);

  const runSearch = useCallback(
    async (lat: number, lon: number, label: string, date?: string) => {
      setSearchLocation(lat, lon);
      setPostcode(label);
      if (date) {
        updateBooking({ date: formatDateLabel(date) });
        try {
          sessionStorage.setItem('kidspot_search_date', date);
        } catch {
          /* ignore */
        }
      }
      onSearchComplete?.();
    },
    [setSearchLocation, setPostcode, updateBooking, onSearchComplete]
  );

  // Apply geolocation when user taps "my location"
  useEffect(() => {
    if (position) {
      void runSearch(position.lat, position.lon, 'Your location', dateQuery || undefined);
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const query = locationQuery.trim();
    if (!query) {
      setError('Enter a postcode or area');
      return;
    }

    setIsSearching(true);
    try {
      const result = await geocodeLocation(query);
      await runSearch(
        result.lat,
        result.lon,
        query.toUpperCase(),
        dateQuery || undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseLocation = async () => {
    setError(null);
    requestLocation();
    // position sync handled via effect below - use separate effect
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0 rounded-2xl sm:rounded-full border border-[#EBE5D3] bg-white p-2 shadow-sm">
          <div className="flex flex-1 items-center gap-2 px-3 sm:border-r sm:border-[#EBE5D3]">
            <span className="material-symbols-outlined text-[20px] text-[#8E8B7B]">location_on</span>
            <input
              type="text"
              placeholder="Postcode or area, e.g. E15 4GH"
              value={locationQuery}
              onChange={(e) => {
                setLocationQuery(e.target.value);
                setError(null);
              }}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-brand-dark placeholder-[#8E8B7B] outline-none"
              disabled={isSearching}
              aria-label="Location"
            />
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={locLoading || isSearching}
              title="Use my location"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8E8B7B] hover:bg-[#F5F2E3] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {locLoading ? 'progress_activity' : 'my_location'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 sm:min-w-[160px]">
            <span className="material-symbols-outlined text-[20px] text-[#8E8B7B]">calendar_today</span>
            <input
              type="date"
              value={dateQuery}
              min={todayIso()}
              onChange={(e) => setDateQuery(e.target.value)}
              className="hero-date-input w-full bg-transparent py-2 text-sm font-medium text-brand-dark outline-none"
              aria-label="Party date"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="rounded-xl sm:rounded-full bg-brand-yellow px-6 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-yellow-hover active:scale-95 disabled:opacity-60 sm:ml-1"
          >
            {isSearching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
    );
  }

  if (variant === 'mobile') {
    return (
      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <div className="relative flex items-center rounded-full border border-white/20 bg-white p-1.5 shadow-xl">
          <span className="material-symbols-outlined ml-3 text-[20px] text-[#8E8B7B]">
            location_on
          </span>
          <input
            type="text"
            placeholder="Postcode or area, e.g. E15 1GH"
            value={locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value);
              setError(null);
            }}
            className="w-full bg-transparent px-3 py-2 text-sm font-medium text-brand-dark placeholder-[#8E8B7B] outline-none"
            disabled={isSearching}
            aria-label="Location"
          />
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locLoading || isSearching}
            title="Use my location"
            className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8E8B7B] hover:bg-[#F5F2E3] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {locLoading ? 'progress_activity' : 'my_location'}
            </span>
          </button>
          <button
            type="submit"
            disabled={isSearching}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-brand-dark shadow-sm transition-all hover:brightness-95 active:scale-95 disabled:opacity-60"
            aria-label="Search"
          >
            {isSearching ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-dark/30 border-t-brand-dark" />
            ) : (
              <span className="material-symbols-outlined text-[20px] font-bold">search</span>
            )}
          </button>
        </div>
        <div className="relative flex items-center rounded-full border border-white/20 bg-white/95 px-4 py-2 shadow-md">
          <span className="material-symbols-outlined mr-2 text-[18px] text-[#8E8B7B]">
            calendar_today
          </span>
          <input
            type="date"
            value={dateQuery}
            min={todayIso()}
            onChange={(e) => setDateQuery(e.target.value)}
            className="hero-date-input w-full bg-transparent text-sm font-medium text-brand-dark outline-none"
            aria-label="Party date"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-500/90 px-3 py-1.5 text-center text-xs font-medium text-white" role="alert">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#EBE5D3] bg-white p-2 shadow-lg">
        <div className="flex items-center gap-2 border-r border-[#EBE5D3] px-4">
          <span className="material-symbols-outlined text-[20px] text-[#8E8B7B]">
            location_on
          </span>
          <input
            type="text"
            placeholder="Postcode or area"
            value={locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value);
              setError(null);
            }}
            className="w-40 bg-transparent py-2 text-sm font-medium text-brand-dark placeholder-[#8E8B7B] outline-none sm:w-44"
            disabled={isSearching}
            aria-label="Location"
          />
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locLoading || isSearching}
            title="Use my location"
            className="text-[#8E8B7B] hover:text-brand-dark disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {locLoading ? 'progress_activity' : 'my_location'}
            </span>
          </button>
        </div>
        <div className="relative flex cursor-pointer items-center gap-2 px-4">
          <span className="material-symbols-outlined text-[20px] text-[#8E8B7B]">
            calendar_today
          </span>
          <input
            type="date"
            value={dateQuery}
            min={todayIso()}
            onChange={(e) => setDateQuery(e.target.value)}
            className="hero-date-input w-36 bg-transparent py-2 text-sm font-medium text-brand-dark outline-none"
            aria-label="Party date"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-full bg-brand-yellow px-8 py-3 text-sm font-bold text-brand-dark shadow-sm transition-all hover:bg-brand-yellow-hover active:scale-95 disabled:opacity-60"
        >
          {isSearching ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-dark/30 border-t-brand-dark" />
              Searching…
            </span>
          ) : (
            'Search'
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
