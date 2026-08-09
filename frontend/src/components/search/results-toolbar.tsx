'use client';

import { QuickFilters } from '@/components/layout/quick-filters';
import { HeroSearchForm } from '@/components/search/hero-search-form';
import { useSearch } from '@/hooks/use-search';
import type { SortMode } from '@/lib/venue-sort';

const RADIUS_OPTIONS = [3, 5, 10] as const;

interface ResultsToolbarProps {
  sort: SortMode;
  onSortChange: (mode: SortMode) => void;
  resultCount?: number;
  onSearchComplete?: () => void;
}

export function ResultsToolbar({ sort, onSortChange, resultCount, onSearchComplete }: ResultsToolbarProps) {
  const { radius, setRadius, venueType } = useSearch();

  const typeLabel =
    venueType === 'softplay'
      ? 'soft play'
      : venueType === 'community_hall'
        ? 'party rooms'
        : venueType === 'leisure_centre'
          ? 'trampolines & activity'
          : venueType === 'park'
            ? 'parks & outdoor'
            : venueType === 'museum'
              ? 'museums'
              : venueType === 'library'
                ? 'libraries'
                : null;

  return (
    <div className="mb-6 space-y-4">
      <HeroSearchForm variant="compact" onSearchComplete={onSearchComplete} />

      <QuickFilters />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#7B785F]">
            Distance
          </span>
          {RADIUS_OPTIONS.map((mi) => (
            <button
              key={mi}
              type="button"
              onClick={() => setRadius(mi)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                radius === mi
                  ? 'border-brand-dark bg-brand-yellow text-brand-dark'
                  : 'border-[#EBE5D3] bg-white text-[#5E5E5E] hover:border-brand-dark/30'
              }`}
              aria-pressed={radius === mi}
            >
              {mi} mi
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-venues" className="text-xs font-bold uppercase tracking-wide text-[#7B785F]">
            Sort
          </label>
          <select
            id="sort-venues"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className="rounded-full border border-[#EBE5D3] bg-white px-3 py-1.5 text-xs font-bold text-brand-dark outline-none focus:ring-2 focus:ring-brand-yellow"
          >
            <option value="recommended">Recommended for parties</option>
            <option value="nearest">Nearest first</option>
            <option value="price">Lowest price</option>
          </select>
        </div>
      </div>

      {resultCount != null && (
        <p className="text-sm text-[#5E5E5E]">
          Showing{' '}
          <span className="font-bold text-brand-dark">{resultCount}</span>{' '}
          {resultCount === 1 ? 'venue' : 'venues'}
          {typeLabel ? ` · ${typeLabel}` : ''}
          {' · '}
          within {radius} miles
        </p>
      )}
    </div>
  );
}
