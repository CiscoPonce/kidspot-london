'use client';

import { useRef, useState, useEffect } from 'react';
import { useSearch } from '@/hooks/use-search';

interface Filter {
  label: string;
  value: string | null;
}

const FILTERS: readonly Filter[] = [
  { label: 'All', value: null },
  { label: 'Soft play', value: 'softplay' },
  { label: 'Halls', value: 'community_hall' },
  { label: 'Activity', value: 'leisure_centre' },
  { label: 'Parks', value: 'park' },
  { label: 'Museums', value: 'museum' },
  { label: 'Libraries', value: 'library' },
];

export function QuickFilters() {
  const { venueType, setVenueType } = useSearch();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <section className="relative w-full">
      <div className="relative flex items-center">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
            className="absolute -left-2 z-10 hidden h-7 w-7 items-center justify-center rounded-md border border-brand-border bg-white text-brand-dark md:flex"
            aria-label="Scroll left"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto py-1"
        >
          {FILTERS.map((filter) => {
            const isActive =
              venueType === filter.value ||
              (filter.value === null && venueType === null);

            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setVenueType(filter.value)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                  isActive
                    ? 'border-brand-dark bg-brand-dark text-white'
                    : 'border-brand-border bg-white text-brand-muted hover:border-brand-dark/40 hover:text-brand-dark'
                }`}
                aria-pressed={isActive}
                aria-label={`Filter by ${filter.label}`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
            className="absolute -right-2 z-10 hidden h-7 w-7 items-center justify-center rounded-md border border-brand-border bg-white text-brand-dark md:flex"
            aria-label="Scroll right"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        )}
      </div>
    </section>
  );
}
