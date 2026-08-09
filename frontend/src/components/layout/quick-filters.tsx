'use client';

import { useRef, useState, useEffect } from 'react';
import { useSearch } from '@/hooks/use-search';

type FilterColor = 'neutral' | 'yellow' | 'peach' | 'violet' | 'green' | 'blue' | 'lavender';

interface Filter {
  label: string;
  value: string | null;
  icon: string;
  color: FilterColor;
}

const FILTERS: readonly Filter[] = [
  { label: 'All Venues', value: null, icon: 'grid_view', color: 'neutral' },
  { label: 'Soft Play', value: 'softplay', icon: 'toys', color: 'yellow' },
  { label: 'Party Rooms', value: 'community_hall', icon: 'celebration', color: 'peach' },
  { label: 'Trampolines & Activity', value: 'leisure_centre', icon: 'sports_gymnastics', color: 'violet' },
  { label: 'Parks & Outdoor', value: 'park', icon: 'park', color: 'green' },
  { label: 'Museums', value: 'museum', icon: 'museum', color: 'blue' },
  { label: 'Libraries', value: 'library', icon: 'local_library', color: 'lavender' },
] as const;

const COLOR_CLASSES: Record<FilterColor, { base: string; active: string; iconBg: string }> = {
  neutral: {
    base: 'bg-white text-brand-dark border-[#EBE5D3] hover:bg-[#F7F4E9] hover:border-[#D6CFB5]',
    active: 'bg-brand-dark text-white border-brand-dark shadow-md ring-2 ring-brand-dark/20',
    iconBg: 'bg-[#F2EFE2] text-brand-dark',
  },
  yellow: {
    base: 'bg-[#FFF9D6] text-[#423700] border-[#F5E278] hover:bg-[#FFF2B2]',
    active: 'bg-brand-yellow text-brand-dark border-[#D6C500] shadow-md ring-2 ring-brand-yellow/40',
    iconBg: 'bg-[#F5E278]/60 text-[#423700]',
  },
  peach: {
    base: 'bg-[#FFF0EB] text-[#591C0E] border-[#FFCBBF] hover:bg-[#FFE0D6]',
    active: 'bg-[#FF6B4A] text-white border-[#E04B2A] shadow-md ring-2 ring-[#FF6B4A]/40',
    iconBg: 'bg-[#FFCBBF]/60 text-[#591C0E]',
  },
  violet: {
    base: 'bg-[#F4EFFF] text-[#361A70] border-[#D8C7FF] hover:bg-[#E7D6FF]',
    active: 'bg-[#8B5CF6] text-white border-[#7C3AED] shadow-md ring-2 ring-[#8B5CF6]/40',
    iconBg: 'bg-[#D8C7FF]/60 text-[#361A70]',
  },
  green: {
    base: 'bg-[#EEF9F0] text-[#0E4A20] border-[#BEEDC7] hover:bg-[#D9F4DF]',
    active: 'bg-[#10B981] text-white border-[#059669] shadow-md ring-2 ring-[#10B981]/40',
    iconBg: 'bg-[#BEEDC7]/60 text-[#0E4A20]',
  },
  blue: {
    base: 'bg-[#EFF8FF] text-[#073F61] border-[#BFEEFF] hover:bg-[#D6F2FF]',
    active: 'bg-[#0EA5E9] text-white border-[#0284C7] shadow-md ring-2 ring-[#0EA5E9]/40',
    iconBg: 'bg-[#BFEEFF]/60 text-[#073F61]',
  },
  lavender: {
    base: 'bg-[#FDF0FF] text-[#4F0F66] border-[#F3C7FF] hover:bg-[#F8D8FF]',
    active: 'bg-[#D946EF] text-white border-[#C026D3] shadow-md ring-2 ring-[#D946EF]/40',
    iconBg: 'bg-[#F3C7FF]/60 text-[#4F0F66]',
  },
};

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

  const scrollBy = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className="relative w-full py-1">
      <div className="group relative flex items-center">
        {/* Left Scroll Chevron (Desktop) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-200)}
            className="absolute -left-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-[#EBE5D3] bg-white/95 text-brand-dark shadow-md backdrop-blur-sm transition hover:bg-brand-yellow md:flex"
            aria-label="Scroll left"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto scroll-smooth py-1 sm:gap-2.5"
        >
          {FILTERS.map((filter) => {
            const isActive =
              venueType === filter.value ||
              (filter.value === null && venueType === null);
            const tones = COLOR_CLASSES[filter.color];

            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setVenueType(filter.value)}
                className={`group/btn inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold leading-none transition-all active:scale-95 sm:text-sm ${
                  isActive ? tones.active : tones.base
                }`}
                aria-pressed={isActive}
                aria-label={`Filter by ${filter.label}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform group-hover/btn:scale-110 ${
                    isActive ? 'bg-white/20 text-current' : tones.iconBg
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] leading-none">
                    {filter.icon}
                  </span>
                </span>
                <span className="whitespace-nowrap">{filter.label}</span>
                {isActive && (
                  <span className="material-symbols-outlined text-[14px] leading-none opacity-80">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Chevron (Desktop) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy(200)}
            className="absolute -right-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-[#EBE5D3] bg-white/95 text-brand-dark shadow-md backdrop-blur-sm transition hover:bg-brand-yellow md:flex"
            aria-label="Scroll right"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        )}
      </div>
    </section>
  );
}
