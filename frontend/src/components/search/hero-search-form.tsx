'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/hooks/use-search';
import { geocodeLocation, useCurrentPosition } from '@/hooks/use-location';

interface HeroSearchFormProps {
  variant?: 'mobile' | 'desktop' | 'compact';
  onSearchComplete?: () => void;
  afterSearchHref?: string;
}

const pillClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-semibold transition ${
    active
      ? 'border-brand-dark bg-brand-dark text-white'
      : 'border-brand-border bg-white text-brand-muted hover:border-brand-dark/40 hover:text-brand-dark'
  }`;

export function HeroSearchForm({ onSearchComplete, afterSearchHref }: HeroSearchFormProps) {
  const router = useRouter();
  const {
    postcode,
    setPostcode,
    setSearchLocation,
    kidsCount,
    setKidsCount,
    intent,
    setIntent,
    ageBand,
    setAgeBand,
  } = useSearch();
  const [locationQuery, setLocationQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loading: locLoading, requestLocation, position } = useCurrentPosition();

  useEffect(() => {
    if (postcode && postcode !== 'London') {
      setLocationQuery(postcode);
    }
  }, [postcode]);

  const runSearch = useCallback(
    async (lat: number, lon: number, label: string) => {
      setSearchLocation(lat, lon);
      setPostcode(label);
      onSearchComplete?.();
      if (afterSearchHref) router.push(afterSearchHref);
    },
    [setSearchLocation, setPostcode, onSearchComplete, afterSearchHref, router]
  );

  useEffect(() => {
    if (position) {
      void runSearch(position.lat, position.lon, 'Your location');
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
      await runSearch(result.lat, result.lon, query.toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button type="button" className={pillClass(intent === 'party')} onClick={() => setIntent('party')}>
          Birthday party
        </button>
        <button type="button" className={pillClass(intent === 'activity')} onClick={() => setIntent('activity')}>
          Activity
        </button>
        <span className="mx-1 hidden h-4 w-px bg-brand-border sm:inline" />
        <button type="button" className={pillClass(ageBand === 'under7')} onClick={() => setAgeBand('under7')}>
          Under 7s
        </button>
        <button type="button" className={pillClass(ageBand === 'any')} onClick={() => setAgeBand('any')}>
          Any age
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-brand-border bg-white p-1.5">
          <span className="material-symbols-outlined pl-2 text-[20px] text-brand-muted">
            location_on
          </span>
          <input
            type="text"
            placeholder="Postcode or area, e.g. E15 4GH"
            value={locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value);
              setError(null);
            }}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-brand-dark placeholder:text-brand-muted outline-none"
            disabled={isSearching}
            aria-label="Location"
          />
          <button
            type="button"
            onClick={() => {
              setError(null);
              requestLocation();
            }}
            disabled={locLoading || isSearching}
            title="Use my location"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-cream-dark disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {locLoading ? 'progress_activity' : 'my_location'}
            </span>
          </button>
        </div>
        <label className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
            Kids
          </span>
          <input
            type="number"
            min={1}
            max={200}
            inputMode="numeric"
            placeholder="8"
            value={kidsCount ?? ''}
            onChange={(e) => {
              const next = e.target.value ? Number(e.target.value) : null;
              setKidsCount(next && next > 0 ? Math.min(200, Math.round(next)) : null);
            }}
            className="w-12 bg-transparent py-1 text-sm font-medium text-brand-dark outline-none"
            aria-label="How many children"
          />
        </label>
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-yellow-hover disabled:opacity-60"
        >
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
