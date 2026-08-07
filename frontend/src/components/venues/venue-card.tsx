'use client';

import Link from 'next/link';
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
  Clock,
} from 'lucide-react';
import { usePlausible } from 'next-plausible';
import type { Venue } from '@/lib/api';
import { trustSignals } from '@/lib/trust';
import { isOpenNow } from '@/lib/opening-hours';
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
    label: 'Soft Play',
    chip: 'bg-[#FFF7B3] text-[#3D3700] border-[#F6E614]/60',
  },
  park: {
    icon: Trees,
    label: 'Park',
    chip: 'bg-[#C8E6C9] text-[#1F4D24] border-[#A5D6A7]/70',
  },
  museum: {
    icon: Landmark,
    label: 'Museum',
    chip: 'bg-[#B3E5FC] text-[#0E3F58] border-[#81D4FA]/70',
  },
  community_hall: {
    icon: Building2,
    label: 'Party Room',
    chip: 'bg-[#FFCCBC] text-[#5C2210] border-[#FFAB91]/70',
  },
  leisure_centre: {
    icon: Building2,
    label: 'Leisure Centre',
    chip: 'bg-[#D7CCF0] text-[#2E2150] border-[#B9A7E6]/70',
  },
  cafe: {
    icon: Building2,
    label: 'Café',
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
    chip: 'ks-chip',
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
  if (!miles && miles !== 0) return '';
  return miles < 0.1 ? '<0.1 mi' : `${miles.toFixed(1)} mi`;
}

function isPartyCapable(venue: Venue): boolean {
  if (venue.party_capable === true) return true;
  if (venue.party_capable === false) return false;
  if (PARTY_TYPES.has(venue.type)) return true;
  return (venue.parent_facets || []).some((f) => PARTY_FACETS.includes(f));
}

function firstImage(venue: Venue): string | undefined {
  if (venue.image_url) return venue.image_url;
  if (Array.isArray(venue.images) && venue.images.length > 0) return venue.images[0];
  return undefined;
}

function partyPriceLabel(venue: Venue): { from: string; unit: string } | null {
  if (typeof venue.party_price_from !== 'number') return null;
  const amount = Number.isInteger(venue.party_price_from)
    ? `£${venue.party_price_from}`
    : `£${venue.party_price_from.toFixed(2)}`;
  const unit =
    venue.party_price_unit === 'per_hour'
      ? '/ hour'
      : venue.party_price_unit === 'flat'
        ? ''
        : '/ child';
  return { from: amount, unit };
}

export function VenueCard({
  venue,
  distance,
  onSelect,
  isSelected,
}: VenueCardProps) {
  const meta = CATEGORY_META[(venue.type as CategoryKey)] ?? CATEGORY_META.other;
  const Icon = meta.icon;
  const sponsorClass = venue.sponsor_tier
    ? SPONSOR_BADGE[venue.sponsor_tier as keyof typeof SPONSOR_BADGE]
    : null;
  const isGold = venue.sponsor_tier === 'gold';
  const plausible = usePlausible();
  const { has, toggle } = useShortlist();

  const isSaved = has(venue.id);
  const imageUrl = firstImage(venue);
  const trust = trustSignals(venue);
  const partyCapable = isPartyCapable(venue);
  const partyPrice = partyPriceLabel(venue);
  const isFreePark = venue.type === 'park' && !partyPrice;
  const capacity = typeof venue.party_max_capacity === 'number' ? venue.party_max_capacity : null;
  const enquiryUrl = venue.party_enquiry_url || venue.booking_url || null;
  const openState = isOpenNow(venue.opening_hours);

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

  const handleEnquiry = (e: React.MouseEvent, kind: 'enquiry' | 'call') => {
    e.stopPropagation();
    plausible('PartyEnquiryClicked', {
      props: { venueId: venue.id, kind, type: venue.type },
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
      className={`group relative cursor-pointer overflow-hidden rounded-3xl bg-white border border-[#EBE5D3] shadow-sm hover:shadow-md transition-all flex flex-col ${
        isSelected ? 'ring-2 ring-brand-yellow' : ''
      }`}
    >
      {/* Image Container with Overlay Badge */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-brand-cream-dark">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={venue.name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F3EEDA]">
            <Icon size={56} strokeWidth={1.5} className="text-[#8E8B7B]" />
          </div>
        )}

        {/* Save / Shortlist Heart Button */}
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from shortlist` : `Add ${venue.name} to shortlist`}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white active:scale-90 transition"
        >
          <Heart
            size={18}
            strokeWidth={2.5}
            className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#5E5E5E]'}
          />
        </button>

        {/* Birthday Party Badge Overlay (Bottom Right of Image) */}
        <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1 text-xs font-bold text-brand-dark shadow-sm border border-black/5">
          <span className="text-[14px]">
            🎂
          </span>
          Birthday Party Venue
        </div>
      </div>

      {/* Content Body */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-tight text-brand-dark line-clamp-1">
              {venue.name}
            </h3>
            {venue.rating && (
              <span className="inline-flex items-center gap-1 font-bold text-sm text-brand-dark shrink-0">
                <Star size={15} strokeWidth={2.5} className="fill-amber-400 text-amber-400" />
                {Number(venue.rating).toFixed(1)}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-[#5E5E5E] font-medium">
            <span>
              {partyPrice ? `From ${partyPrice.from}${partyPrice.unit}` : 'Contact for pricing'}
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} />
              Up to {capacity || 30}
            </span>
          </div>
        </div>

        {/* Full-width Yellow CTA Button */}
        <div className="mt-4">
          <Link
            href={`/venue/${venue.slug}`}
            onClick={(e) => {
              e.stopPropagation();
              plausible('VenueViewed', {
                props: { venueId: venue.id, source: 'card_button' },
              });
            }}
            className="w-full inline-flex items-center justify-center gap-1 rounded-full bg-[#FFF499] text-brand-dark py-2.5 px-4 text-xs font-bold hover:bg-brand-yellow transition-colors"
          >
            View Details <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
