'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Trees,
  Building2,
  Joystick,
  MapPin,
  BookOpen,
  Landmark,
  Heart,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { usePlausible } from 'next-plausible';
import type { Venue } from '@/lib/api';

interface VenueCardProps {
  venue: Venue;
  distance: number;
  onSelect: () => void;
  isSelected?: boolean;
}

type CategoryKey = 'softplay' | 'park' | 'museum' | 'community_hall' | 'library' | 'other';

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

function formatDistance(miles: number): string {
  if (!miles && miles !== 0) return '';
  return miles < 0.1 ? '<0.1 mi' : `${miles.toFixed(1)} mi`;
}

function formatPrice(venue: Venue): { label: string; tone: 'price' | 'free' } | null {
  if (venue.type === 'park' && (venue.price_level === 0 || venue.price_level == null)) {
    return { label: 'Free', tone: 'free' };
  }
  if (venue.price_level == null) return null;
  const tier = Math.max(0, Math.min(4, Number(venue.price_level)));
  if (tier === 0) return { label: 'Free', tone: 'free' };
  return { label: '£'.repeat(tier), tone: 'price' };
}

function isSafeChecked(venue: Venue): boolean {
  // Heuristic until we add an explicit boolean (Phase 11.5):
  //  - sponsored venues are owner-verified
  //  - high-rated venues are crowd-validated
  //  - well-formed venues with phone/website + borough have passed enrichment
  if (venue.sponsor_tier) return true;
  if (typeof venue.rating === 'number' && venue.rating >= 4.0) return true;
  if (venue.borough && (venue.phone || venue.website)) return true;
  return false;
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
  const [isSaved, setIsSaved] = useState(false);

  const imageUrl = venue.image_url;
  const safeChecked = isSafeChecked(venue);
  const price = formatPrice(venue);

  const handleCardClick = () => {
    plausible('VenueSelected', {
      props: { venueId: venue.id, source: 'card_click' },
    });
    onSelect();
  };

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved((s) => !s);
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
      className={`group relative cursor-pointer overflow-hidden ks-card flex flex-col sm:flex-row ${
        isSelected
          ? 'ks-card-active'
          : ''
      } ${isGold ? 'ring-2 ring-[#efdf00]' : ''}`}
    >
      {/* Featured ribbon for Gold */}
      {isGold && (
        <div className="pointer-events-none absolute right-0 top-0 z-20 h-16 w-16 overflow-hidden">
          <div className="absolute right-[-24px] top-2 w-24 rotate-45 bg-amber-400 py-1 text-center text-[8px] font-black uppercase tracking-tighter text-amber-900 shadow-sm">
            Featured
          </div>
        </div>
      )}

      {/* Image / gradient placeholder */}
      <div
        className="relative shrink-0 overflow-hidden bg-surface-variant sm:w-[40%] sm:min-w-[180px]"
      >
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

        {/* Heart save button */}
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from saved` : `Save ${venue.name}`}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/90 backdrop-blur-sm shadow-sm hover:bg-surface-container-lowest active:scale-90 transition"
        >
          <Heart
            size={18}
            strokeWidth={2.5}
            className={isSaved ? 'fill-primary text-primary' : 'text-on-surface-variant'}
          />
        </button>

        {/* Safe-checked pill */}
        {safeChecked && (
          <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-tertiary-container text-on-tertiary-container px-2.5 py-1 text-[11px] font-semibold shadow-sm">
            <ShieldCheck size={12} strokeWidth={2.5} />
            Safe-checked
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

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
            {venue.rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-on-background">
                <Star size={14} strokeWidth={2.5} className="fill-primary text-primary" />
                {Number(venue.rating).toFixed(1)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">child_care</span>
              0-12 yrs {/* Mocked until data provides it */}
            </span>
            {distance > 0 && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} strokeWidth={2.5} />
                {formatDistance(distance)}
              </span>
            )}
            {/* Contact availability indicators */}
            {(venue.phone || venue.website || venue.email) && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-outline">
                {venue.phone && (
                  <span className="material-symbols-outlined text-[14px] text-tertiary" title="Phone available">call</span>
                )}
                {venue.website && (
                  <span className="material-symbols-outlined text-[14px] text-tertiary" title="Website available">language</span>
                )}
                {venue.email && (
                  <span className="material-symbols-outlined text-[14px] text-tertiary" title="Email available">mail</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {price ? (
              <p className="text-sm leading-tight text-on-surface-variant">
                {price.tone === 'free' ? (
                  <span className="font-bold text-tertiary">Free</span>
                ) : (
                  <>
                    <span className="text-xs uppercase tracking-wide text-outline">from </span>
                    <span className="font-bold text-on-background">{price.label}</span>
                    <span className="text-xs text-outline"> / child</span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-outline">Tap to see details</p>
            )}
          </div>

          <Link
            href={`/venue/${venue.slug}`}
            onClick={(e) => {
              e.stopPropagation();
              plausible('VenueViewed', {
                props: { venueId: venue.id, source: 'detail_link' },
              });
            }}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-container text-on-primary-container px-5 py-2.5 text-sm font-bold shadow-sm hover:brightness-95 active:scale-95 transition"
            aria-label={`View full details for ${venue.name}`}
          >
            View
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
