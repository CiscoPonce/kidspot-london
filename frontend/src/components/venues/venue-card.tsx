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
    gradient: string;
  }
> = {
  softplay: {
    icon: Joystick,
    label: 'Soft Play',
    chip: 'bg-[#FFF7B3] text-[#3D3700] border-[#F6E614]/60',
    gradient: 'from-[#FFF1A1] via-[#FFE066] to-[#EFDF00]',
  },
  park: {
    icon: Trees,
    label: 'Park',
    chip: 'bg-[#C8E6C9] text-[#1F4D24] border-[#A5D6A7]/70',
    gradient: 'from-[#D4EDD5] via-[#A5D6A7] to-[#7DC089]',
  },
  museum: {
    icon: Landmark,
    label: 'Museum',
    chip: 'bg-[#B3E5FC] text-[#0E3F58] border-[#81D4FA]/70',
    gradient: 'from-[#CDEEFB] via-[#81D4FA] to-[#5DBEE8]',
  },
  community_hall: {
    icon: Building2,
    label: 'Party Room',
    chip: 'bg-[#FFCCBC] text-[#5C2210] border-[#FFAB91]/70',
    gradient: 'from-[#FFD9C9] via-[#FFAB91] to-[#FF8A65]',
  },
  library: {
    icon: BookOpen,
    label: 'Library',
    chip: 'bg-[#E1BEE7] text-[#4A1E54] border-[#CE93D8]/70',
    gradient: 'from-[#EDD2F2] via-[#CE93D8] to-[#BA68C8]',
  },
  other: {
    icon: MapPin,
    label: 'Venue',
    chip: 'bg-surface-container text-on-surface-variant border-outline-variant',
    gradient: 'from-[#F3EEDA] via-[#E8E3CF] to-[#CCC7AB]',
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
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all duration-200 flex flex-col sm:flex-row ${
        isSelected
          ? 'border-[#EFDF00] ring-2 ring-[#EFDF00]/40 shadow-[0_8px_24px_rgba(239,223,0,0.18)]'
          : 'border-outline-variant hover:border-[#b9b496] hover:shadow-[0_8px_24px_rgba(29,28,16,0.08)]'
      } ${isGold ? 'ring-1 ring-amber-300/60' : ''}`}
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
        className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${meta.gradient} sm:w-[40%] sm:min-w-[180px]`}
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
              <Icon size={56} strokeWidth={1.5} className="text-white/85 drop-shadow" />
            </div>
          )}
        </div>

        {/* Heart save button */}
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from saved` : `Save ${venue.name}`}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm hover:bg-white active:scale-90 transition"
        >
          <Heart
            size={18}
            strokeWidth={2.5}
            className={isSaved ? 'fill-[#EFDF00] text-[#1f1c00]' : 'text-on-surface-variant'}
          />
        </button>

        {/* Safe-checked pill */}
        {safeChecked && (
          <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#006972] shadow-sm">
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

          <div className="mt-1.5 flex items-center gap-2 text-sm text-on-surface-variant">
            {venue.rating ? (
              <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                <Star size={14} strokeWidth={2.5} fill="#EFDF00" className="text-[#EFDF00]" />
                {Number(venue.rating).toFixed(1)}
              </span>
            ) : null}
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
            {price ? (
              <p className="text-sm leading-tight text-on-surface-variant">
                {price.tone === 'free' ? (
                  <span className="font-bold text-[#1F4D24]">Free</span>
                ) : (
                  <>
                    <span className="text-xs uppercase tracking-wide text-outline">from </span>
                    <span className="font-bold text-on-surface">{price.label}</span>
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
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#EFDF00] px-4 py-2 text-sm font-bold text-[#1F1C00] shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] hover:brightness-95 active:scale-95 transition"
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
