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
    <section className="py-12 px-6 bg-pure-white border-b border-border-gray">
      <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar max-w-6xl mx-auto">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setVenueType(venueType === filter.value ? null : filter.value)}
            className={`flex-shrink-0 min-h-[touch-target-min] px-button-x py-button-y border border-absolute-black transition-colors duration-200 font-button-label text-button-label uppercase
              ${venueType === filter.value 
                ? 'bg-absolute-black text-pure-white' 
                : 'bg-transparent text-absolute-black hover:text-renault-blue hover:border-renault-blue'
              }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </section>
  );
}
