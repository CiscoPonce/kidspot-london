'use client';

import { useSearch } from '@/hooks/use-search';

type FilterColor = 'neutral' | 'yellow' | 'green' | 'blue' | 'peach' | 'lavender';

interface Filter {
  label: string;
  value: string | null;
  icon: string;
  color: FilterColor;
}

const FILTERS: readonly Filter[] = [
  { label: 'All', value: null, icon: 'apps', color: 'neutral' },
  { label: 'Soft Play', value: 'softplay', icon: 'toys', color: 'yellow' },
  { label: 'Parks', value: 'park', icon: 'park', color: 'green' },
  { label: 'Museums', value: 'museum', icon: 'museum', color: 'blue' },
  { label: 'Party Rooms', value: 'community_hall', icon: 'celebration', color: 'peach' },
  { label: 'Libraries', value: 'library', icon: 'local_library', color: 'lavender' },
] as const;

const COLOR_CLASSES: Record<FilterColor, { base: string; active: string }> = {
  neutral: {
    base: 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high',
    active: 'bg-primary-container text-on-primary-container border-primary-fixed',
  },
  yellow: {
    base: 'bg-[#FFF7B3] text-[#3D3700] border-[#F6E614]/60 hover:bg-[#F6E614]',
    active: 'bg-[#EFDF00] text-[#1F1C00] border-[#D8CA00] shadow-[0_4px_12px_rgba(239,223,0,0.35)]',
  },
  green: {
    base: 'bg-[#C8E6C9] text-[#1F4D24] border-[#A5D6A7]/70 hover:bg-[#B7DDB8]',
    active: 'bg-[#7DC089] text-[#0F2A14] border-[#4FA859] shadow-[0_4px_12px_rgba(125,192,137,0.35)]',
  },
  blue: {
    base: 'bg-[#B3E5FC] text-[#0E3F58] border-[#81D4FA]/70 hover:bg-[#9FDDF8]',
    active: 'bg-[#5DBEE8] text-[#03263A] border-[#1E96D2] shadow-[0_4px_12px_rgba(93,190,232,0.35)]',
  },
  peach: {
    base: 'bg-[#FFCCBC] text-[#5C2210] border-[#FFAB91]/70 hover:bg-[#FFB59C]',
    active: 'bg-[#FF8A65] text-[#3A1308] border-[#FF6E40] shadow-[0_4px_12px_rgba(255,138,101,0.35)]',
  },
  lavender: {
    base: 'bg-[#E1BEE7] text-[#4A1E54] border-[#CE93D8]/70 hover:bg-[#D7AEDD]',
    active: 'bg-[#BA68C8] text-[#2D0E36] border-[#9C27B0] shadow-[0_4px_12px_rgba(186,104,200,0.35)]',
  },
};

export function QuickFilters() {
  const { venueType, setVenueType } = useSearch();

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="w-full">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
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
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold leading-none transition-all whitespace-nowrap active:scale-95 ${
                  isActive ? tones.active : tones.base
                }`}
                aria-pressed={isActive}
                aria-label={`Filter by ${filter.label}`}
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
