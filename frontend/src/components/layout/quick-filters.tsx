'use client';

import React from 'react';
import { useSearch } from '@/hooks/use-search';

const FILTERS = [
  { label: 'Indoor', value: 'softplay' },
  { label: 'Outdoor', value: 'park' },
  { label: 'Museums', value: 'museum' },
  { label: 'Libraries', value: 'library' },
  { label: 'Community', value: 'community_hall' },
  { label: 'Leisure', value: 'leisure_centre' },
  { label: 'Cafes', value: 'cafe' },
];

export function QuickFilters() {
  const { venueType, setVenueType } = useSearch();

  return (
    <section className="px-margin-mobile py-stack-md overflow-x-auto no-scrollbar">
      <div className="flex gap-3 min-w-max">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setVenueType(venueType === filter.value ? null : filter.value)}
            className={`px-4 py-2 rounded-full font-label-caps text-label-caps whitespace-nowrap transition-all duration-200
              ${venueType === filter.value 
                ? 'bg-primary-container text-on-primary-container shadow-sm' 
                : 'bg-[#F9F9F7] text-on-surface-variant border border-outline-variant hover:bg-surface-variant'
              }`}
          >
            {filter.label.toUpperCase()}
          </button>
        ))}
      </div>
    </section>
  );
}
