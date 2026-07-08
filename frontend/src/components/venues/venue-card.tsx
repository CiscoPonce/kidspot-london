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
      className={`group relative cursor-pointer overflow-hidden ks-card flex flex-col sm:flex-row ${
        isSelected ? 'ks-card-active' : ''
      } ${isGold ? 'ring-2 ring-[#efdf00]' : ''}`}
    >
      {isGold && (
        <div className="pointer-events-none absolute right-0 top-0 z-20 h-16 w-16 overflow-hidden">
          <div className="absolute right-[-24px] top-2 w-24 rotate-45 bg-amber-400 py-1 text-center text-[8px] font-black uppercase tracking-tighter text-amber-900 shadow-sm">
            Featured
          </div>
        </div>
      )}

      {/* Image / category placeholder */}
      <div className="relative shrink-0 overflow-hidden bg-surface-variant sm:w-[40%] sm:min-w-[180px]">
        <div className="aspect-[16/10] sm:aspect-auto sm:h-full sm:min-h-[180px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={venue.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon size={56} strokeWidth={1.5} className="text-on-surface-variant/40" />
            </div>
          )}
        </div>

        {/* Save / shortlist button */}
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from shortlist` : `Add ${venue.name} to shortlist`}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest/90 backdrop-blur-sm shadow-sm hover:bg-surface-container-lowest active:scale-90 transition"
        >
          <Heart
            size={20}
            strokeWidth={2.5}
            className={isSaved ? 'fill-primary text-primary' : 'text-on-surface-variant'}
          />
        </button>

        {/* Party-capable badge */}
        {partyCapable && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-primary text-on-primary px-2.5 py-1 text-[11px] font-bold shadow-sm">
            🎉 Hosts parties
          </span>
        )}

        {/* Verifiable trust signal (replaces the old fake "Safe-checked") */}
        {trust.length > 0 && (
          <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-tertiary-container text-on-tertiary-container px-2.5 py-1 text-[11px] font-semibold shadow-sm">
            <span className="material-symbols-outlined text-[13px]">{trust[0].icon}</span>
            {trust[0].label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <div className="flex items-start gap-2">
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}
            >
              {meta.label}
              {venue.borough ? <span className="opacity-70">· {venue.borough}</span> : null}
            </span>
            {sponsorClass && (
              <span
                className={`inline-flex items-center rounded-full border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm ${sponsorClass}`}
              >
                {venue.sponsor_tier}
              </span>
            )}
          </div>

          <h3 className="mt-2 font-display text-[1.05rem] sm:text-lg font-bold leading-tight text-on-background line-clamp-2">
            {venue.name}
          </h3>

          {/* Party data + quick action — price, capacity, Enquire/Call */}
          {(partyPrice || capacity) && (partyCapable || isFreePark) ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {partyPrice ? (
                  <p className="text-sm leading-tight">
                    <span className="text-xs uppercase tracking-wide text-outline">from </span>
                    <span className="font-bold text-on-background text-base">{partyPrice.from}</span>
                    {partyPrice.unit ? <span className="text-xs text-outline"> {partyPrice.unit}</span> : null}
                  </p>
                ) : isFreePark ? (
                  <p className="text-sm leading-tight">
                    <span className="font-bold text-tertiary text-base">Free</span>
                    <span className="text-xs text-outline"> · outdoor party</span>
                  </p>
                ) : null}
                {capacity ? (
                  <span className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
                    <Users size={14} strokeWidth={2.5} />
                    Up to {capacity}
                  </span>
                ) : null}
              </div>
              {partyCapable && enquiryUrl ? (
                <a
                  href={enquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleEnquiry(e, 'enquiry')}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-on-primary px-4 py-2.5 text-sm font-bold shadow-sm hover:brightness-95 active:scale-95 transition"
                  aria-label={`Enquire about a party at ${venue.name}`}
                >
                  Enquire
                </a>
              ) : partyCapable && venue.phone ? (
                <a
                  href={`tel:${venue.phone}`}
                  onClick={(e) => handleEnquiry(e, 'call')}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-on-primary px-4 py-2.5 text-sm font-bold shadow-sm hover:brightness-95 active:scale-95 transition"
                  aria-label={`Call ${venue.name} about a party`}
                >
                  Call
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
            {venue.rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-on-background">
                <Star size={14} strokeWidth={2.5} className="fill-primary text-primary" />
                {Number(venue.rating).toFixed(1)}
              </span>
            ) : null}

            {openState !== 'unknown' && (
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  openState === 'open' ? 'text-tertiary' : 'text-outline'
                }`}
              >
                <Clock size={13} strokeWidth={2.5} />
                {openState === 'open' ? 'Open now' : 'Closed'}
              </span>
            )}
            {distance > 0 && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} strokeWidth={2.5} />
                {formatDistance(distance)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {!partyCapable && !isFreePark ? (
              <p className="text-xs text-outline">Tap for details</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!partyCapable && enquiryUrl ? (
              <a
                href={enquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleEnquiry(e, 'enquiry')}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-on-primary px-4 py-3 text-sm min-h-[44px] font-bold shadow-sm hover:brightness-95 active:scale-95 transition"
                aria-label={`Enquire about a party at ${venue.name}`}
              >
                Enquire
              </a>
            ) : null}
            <Link
              href={`/venue/${venue.slug}`}
              onClick={(e) => {
                e.stopPropagation();
                plausible('VenueViewed', {
                  props: { venueId: venue.id, source: 'detail_link' },
                });
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-container text-on-primary-container px-4 py-3 text-sm min-h-[44px] font-bold shadow-sm hover:brightness-95 active:scale-95 transition"
              aria-label={`View full details for ${venue.name}`}
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
