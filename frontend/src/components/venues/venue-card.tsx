'use client';

import { VenueImagePlaceholder } from '@/components/venues/venue-image-placeholder';
import { usePlausible } from 'next-plausible';
import type { Venue } from '@/lib/api';
import {
  Trees,
  Building2,
  Joystick,
  MapPin,
  BookOpen,
  Landmark,
  Heart,
  Star,
  Users,
} from 'lucide-react';
import { formatPartyPrice } from '@/lib/venue-images';
import { useShortlist } from '@/hooks/use-shortlist';

interface VenueCardProps {
  venue: Venue;
  distance: number;
  onSelect: () => void;
  isSelected?: boolean;
}

type CategoryKey = 'softplay' | 'park' | 'museum' | 'community_hall' | 'library' | 'leisure_centre' | 'cafe' | 'other';

const CATEGORY_META: Record<
  CategoryKey,
  {
    icon: typeof Trees;
    label: string;
    chip: string;
  }
> = {
  softplay: {
    icon: Joystick,
    label: 'Soft Play & Activity',
    chip: 'bg-[#FFF7B3] text-[#3D3700] border-[#F6E614]/60',
  },
  park: {
    icon: Trees,
    label: 'Outdoor Space',
    chip: 'bg-[#C8E6C9] text-[#1F4D24] border-[#A5D6A7]/70',
  },
  museum: {
    icon: Landmark,
    label: 'Museum',
    chip: 'bg-[#B3E5FC] text-[#0E3F58] border-[#81D4FA]/70',
  },
  community_hall: {
    icon: Building2,
    label: 'Party Room Hire',
    chip: 'bg-[#FFCCBC] text-[#5C2210] border-[#FFAB91]/70',
  },
  leisure_centre: {
    icon: Building2,
    label: 'Leisure Centre',
    chip: 'bg-[#D7CCF0] text-[#2E2150] border-[#B9A7E6]/70',
  },
  cafe: {
    icon: Building2,
    label: 'Café & Food',
    chip: 'bg-[#FFE0B2] text-[#5A3A0E] border-[#FFCC80]/70',
  },
  library: {
    icon: BookOpen,
    label: 'Library',
    chip: 'bg-[#E1BEE7] text-[#4A1E54] border-[#CE93D8]/70',
  },
  other: {
    icon: MapPin,
    label: 'Venue',
    chip: 'bg-[#F5F2E3] text-brand-dark border-[#EBE5D3]',
  },
};

const SPONSOR_BADGE = {
  gold: 'bg-amber-100 text-amber-800 border-amber-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-200',
  bronze: 'bg-orange-100 text-orange-700 border-orange-200',
} as const;

const PARTY_TYPES = new Set(['softplay', 'community_hall']);
const PARTY_FACETS = ['soft_play', 'party_hire', 'hall_hire'];

function formatDistance(miles: number): string {
  if (miles == null || Number.isNaN(miles)) return '';
  return miles < 0.1 ? '<0.1 mi away' : `${miles.toFixed(1)} mi away`;
}

function isPartyCapable(venue: Venue): boolean {
  if (venue.party_capable === true) return true;
  if (venue.party_capable === false) return false;
  if (PARTY_TYPES.has(venue.type)) return true;
  return (venue.parent_facets || []).some((f) => PARTY_FACETS.includes(f));
}

function badgeLabel(venue: Venue, partyCapable: boolean): string | null {
  const name = venue.name.toLowerCase();
  if (/mcdonald|burger king|wacky warehouse/.test(name)) return 'Kids party packages';
  if (venue.type === 'softplay' || /flip out|oxygen|trampoline|bounce/.test(name)) {
    return 'Birthday parties';
  }
  if (venue.type === 'community_hall' && partyCapable) return 'Hall hire for parties';
  if (venue.type === 'park') return 'Outdoor parties';
  if (partyCapable) return 'Party hire available';
  return null;
}

function firstImage(venue: Venue): string | undefined {
  if (venue.image_url) return venue.image_url;
  if (Array.isArray(venue.images) && venue.images.length > 0) return venue.images[0];
  return undefined;
}

export function VenueCard({
  venue,
  distance,
  onSelect,
  isSelected,
}: VenueCardProps) {
  const meta = CATEGORY_META[(venue.type as CategoryKey)] ?? CATEGORY_META.other;
  const CategoryIcon = meta.icon;
  const sponsorClass = venue.sponsor_tier
    ? SPONSOR_BADGE[venue.sponsor_tier as keyof typeof SPONSOR_BADGE]
    : null;
  const plausible = usePlausible();
  const { has, toggle } = useShortlist();

  const isSaved = has(venue.id);
  const imageUrl = firstImage(venue);
  const partyCapable = isPartyCapable(venue);
  const partyPrice = formatPartyPrice(venue);
  const badge = badgeLabel(venue, partyCapable);

  const handleCardClick = () => {
    plausible('VenueSelected', {
      props: { venueId: venue.id, source: 'card_click' },
    });
    onSelect();
  };

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(venue);
    plausible('VenueSaved', {
      props: { venueId: venue.id, saved: !isSaved },
    });
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-[#EBE5D3] bg-white shadow-sm transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-brand-yellow' : ''
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-cream-dark">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={venue.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <VenueImagePlaceholder type={venue.type} name={venue.name} />
        )}

        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from shortlist` : `Add ${venue.name} to shortlist`}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:bg-white active:scale-90"
        >
          <Heart
            size={18}
            strokeWidth={2.5}
            className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#5E5E5E]'}
          />
        </button>

        {badge && (
          <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/95 px-3 py-1 text-xs font-bold text-brand-dark shadow-sm backdrop-blur-sm">
            <span className="text-[14px]">🎂</span>
            {badge}
          </div>
        )}

        {sponsorClass && (
          <div className={`absolute left-3 top-3 z-10 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${sponsorClass}`}>
            Featured
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${meta.chip}`}>
              <CategoryIcon size={12} strokeWidth={2.5} />
              {meta.label}
            </span>
            {(distance > 0 || venue.borough) && (
              <span className="text-[10px] font-semibold text-[#7B785F]">
                {distance > 0 ? `${formatDistance(distance)} away` : ''}
                {distance > 0 && venue.borough ? ' • ' : ''}
                {venue.borough || ''}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-brand-dark">
              {venue.name}
            </h3>
            {venue.rating && (
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-dark">
                <Star size={15} strokeWidth={2.5} className="fill-amber-400 text-amber-400" />
                {Number(venue.rating).toFixed(1)}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs font-medium text-[#5E5E5E]">
            <span>{partyPrice || 'Contact venue for pricing'}</span>
            {venue.party_max_capacity != null && (
              <span className="flex items-center gap-1">
                <Users size={14} />
                Up to {venue.party_max_capacity} kids
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <span className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#FFF499] px-4 py-2.5 text-xs font-bold text-brand-dark transition-colors group-hover:bg-brand-yellow">
            View details
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </span>
        </div>
      </div>
    </article>
  );
}
