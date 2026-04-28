'use client';

import { useSearch } from '@/hooks/use-search';

const FILTERS = [
  { label: 'All', value: null, icon: 'apps' },
  { label: 'Soft play', value: 'softplay', icon: 'toys' },
  { label: 'Parks', value: 'park', icon: 'park' },
  { label: 'Museums', value: 'museum', icon: 'museum' },
  { label: 'Libraries', value: 'library', icon: 'local_library' },
  { label: 'Community', value: 'community_hall', icon: 'diversity_3' },
  { label: 'Leisure', value: 'leisure_centre', icon: 'pool' },
  { label: 'Cafes', value: 'cafe', icon: 'coffee' },
] as const;

export function QuickFilters() {
  const { venueType, setVenueType } = useSearch();

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max sm:flex-wrap">
          {FILTERS.map((filter) => {
            const isActive =
              venueType === filter.value ||
              (filter.value === null && venueType === null);
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setVenueType(filter.value)}
                className={`ks-chip ${isActive ? 'ks-chip-active' : ''}`}
                aria-pressed={isActive}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  {filter.icon}
                </span>
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
