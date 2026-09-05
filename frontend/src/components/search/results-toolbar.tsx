'use client';

import { QuickFilters } from '@/components/layout/quick-filters';
import { useSearch } from '@/hooks/use-search';
import type { SortMode } from '@/lib/venue-sort';

const RADIUS_OPTIONS = [3, 5, 10] as const;

export type MobileView = 'list' | 'map';

interface ResultsToolbarProps {
  sort: SortMode;
  onSortChange: (mode: SortMode) => void;
  resultCount?: number;
  mobileView?: MobileView;
  onMobileViewChange?: (view: MobileView) => void;
}

export function ResultsToolbar({
  sort,
  onSortChange,
  resultCount,
  mobileView,
  onMobileViewChange,
}: ResultsToolbarProps) {
  const { radius, setRadius, venueType, catering, setCatering, kidsCount } = useSearch();

  const typeLabel =
    venueType === 'softplay'
      ? 'soft play'
      : venueType === 'community_hall'
        ? 'party rooms'
        : venueType === 'leisure_centre'
          ? 'activity centres'
          : venueType === 'park'
            ? 'parks'
            : venueType === 'museum'
              ? 'museums'
              : venueType === 'library'
                ? 'libraries'
                : null;

  return (
    <div className="mb-4 space-y-3">
      <QuickFilters />

      <div className="flex flex-wrap items-center gap-2">
        {(['any', 'byo', 'included'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCatering(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              catering === value
                ? 'border-brand-dark bg-brand-dark text-white'
                : 'border-brand-border bg-white text-brand-muted hover:border-brand-dark/30'
            }`}
            aria-pressed={catering === value}
          >
            {value === 'any' ? 'Any food' : value === 'byo' ? 'Confirmed BYO' : 'Confirmed food'}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-brand-border sm:inline" />
        {RADIUS_OPTIONS.map((mi) => (
          <button
            key={mi}
            type="button"
            onClick={() => setRadius(mi)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              radius === mi
                ? 'border-brand-dark bg-brand-yellow text-brand-dark'
                : 'border-brand-border bg-white text-brand-muted hover:border-brand-dark/30'
            }`}
            aria-pressed={radius === mi}
          >
            {mi} mi
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {onMobileViewChange && (
            <div className="flex rounded-full border border-brand-border bg-white p-0.5 lg:hidden">
              <button
                type="button"
                onClick={() => onMobileViewChange('list')}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  mobileView === 'list' ? 'bg-brand-dark text-white' : 'text-brand-muted'
                }`}
                aria-pressed={mobileView === 'list'}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => onMobileViewChange('map')}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  mobileView === 'map' ? 'bg-brand-dark text-white' : 'text-brand-muted'
                }`}
                aria-pressed={mobileView === 'map'}
              >
                Map
              </button>
            </div>
          )}
          <select
            id="sort-venues"
            aria-label="Sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className="rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-medium text-brand-dark outline-none"
          >
            <option value="recommended">Recommended</option>
            <option value="nearest">Nearest</option>
            <option value="price">Lowest price</option>
          </select>
        </div>
      </div>

      {resultCount != null && (
        <p className="text-sm text-brand-muted">
          <span className="font-semibold text-brand-dark">{resultCount}</span>{' '}
          {resultCount === 1 ? 'venue' : 'venues'}
          {typeLabel ? ` · ${typeLabel}` : ''}
          {kidsCount ? ` · fits ${kidsCount} kids` : ''}
          {catering === 'byo' ? ' · BYO food' : catering === 'included' ? ' · food included' : ''}
          {' · '}
          within {radius} miles
        </p>
      )}
    </div>
  );
}
