'use client';

import Link from 'next/link';
import {
  Trees,
  Building2,
  Joystick,
  Dumbbell,
  MapPin,
  BookOpen,
  Coffee,
  Landmark,
  ArrowUpRight,
  Star,
} from 'lucide-react';
import { usePlausible } from 'next-plausible';
import type { Venue } from '@/lib/api';

interface VenueCardProps {
  venue: Venue;
  distance: number;
  onSelect: () => void;
  isSelected?: boolean;
}

const TYPE_META: Record<
  string,
  { icon: typeof Trees; label: string }
> = {
  park: { icon: Trees, label: 'Park' },
  community_hall: { icon: Building2, label: 'Community hall' },
  softplay: { icon: Joystick, label: 'Soft play' },
  sports_centre: { icon: Dumbbell, label: 'Sports centre' },
  leisure_centre: { icon: Dumbbell, label: 'Leisure centre' },
  museum: { icon: Landmark, label: 'Museum' },
  library: { icon: BookOpen, label: 'Library' },
  cafe: { icon: Coffee, label: 'Cafe' },
  other: { icon: MapPin, label: 'Other' },
};

const SPONSOR_BADGE = {
  gold: 'bg-amber-100 text-amber-800 border-amber-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-200',
  bronze: 'bg-orange-100 text-orange-700 border-orange-200',
} as const;

const FEATURE_LABELS: Record<string, string> = {
  soft_play: 'Soft play',
  party_hire: 'Party hire',
  cafe: 'Cafe',
  parking: 'Parking',
  wheelchair_accessible: 'Step-free',
  toilets: 'Toilets',
};

function formatDistance(miles: number): string {
  if (!miles && miles !== 0) return '';
  return miles < 0.1
    ? '<0.1 mi'
    : miles < 1
      ? `${miles.toFixed(1)} mi`
      : `${miles.toFixed(1)} mi`;
}

export function VenueCard({
  venue,
  distance,
  onSelect,
  isSelected,
}: VenueCardProps) {
  const meta = TYPE_META[venue.type] ?? TYPE_META.other;
  const Icon = meta.icon;
  const sponsorClass = venue.sponsor_tier
    ? SPONSOR_BADGE[venue.sponsor_tier as keyof typeof SPONSOR_BADGE]
    : null;
  const plausible = usePlausible();

  const handleCardClick = () => {
    plausible('VenueSelected', {
      props: { venueId: venue.id, source: 'card_click' },
    });
    onSelect();
  };

  // Premium tier styles
  const isGold = venue.sponsor_tier === 'gold';
  const isSilver = venue.sponsor_tier === 'silver';
  const isBronze = venue.sponsor_tier === 'bronze';

  const cardClasses = `
    ks-card transition-all duration-300 relative overflow-hidden
    ${isSelected ? 'ks-card-active scale-[1.02] ring-2 ring-primary shadow-lg' : 'hover:scale-[1.01] hover:shadow-md'}
    ${isGold ? 'bg-amber-50/40 border-amber-200' : ''}
    ${isSilver ? 'bg-slate-50/40 border-slate-200' : ''}
    ${isBronze ? 'border-orange-100' : ''}
    group cursor-pointer p-4 sm:p-5 flex gap-4
  `;

  const iconClasses = `
    flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
    ${isSelected ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant group-hover:bg-primary-container/60 group-hover:text-on-primary-container'}
    ${isGold ? 'bg-amber-100 text-amber-700' : ''}
    ${isSilver ? 'bg-slate-100 text-slate-700' : ''}
  `;

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
      className={cardClasses.trim()}
    >
      {/* Featured ribbon for Gold */}
      {isGold && (
        <div className="absolute top-0 right-0 overflow-hidden w-16 h-16 pointer-events-none">
          <div className="bg-amber-400 text-amber-900 text-[8px] font-black uppercase tracking-tighter text-center py-1 absolute top-2 right-[-24px] rotate-45 w-24 shadow-sm">
            Featured
          </div>
        </div>
      )}

      <div className={iconClasses.trim()}>
        <Icon size={26} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`font-display text-lg font-bold leading-snug text-on-background truncate ${isGold ? 'text-amber-900' : ''}`}>
              {venue.name}
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5 font-medium">
              {meta.label}
              {venue.borough ? ` · ${venue.borough}` : ''}
            </p>
          </div>
          {distance > 0 && (
            <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${isGold ? 'bg-amber-100 text-amber-800' : 'bg-surface-container text-on-surface-variant'} px-2.5 py-1 rounded-full border border-black/5`}>
              <MapPin size={10} strokeWidth={3} />
              {formatDistance(distance)}
            </span>
          )}
        </div>

        {(venue.rating ||
          (venue.price_level !== undefined && venue.price_level !== null) ||
          sponsorClass ||
          (venue.features && venue.features.length > 0)) && (
          <div className="flex items-center flex-wrap gap-1.5 mt-3">
            {venue.rating && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full shadow-sm">
                <Star size={10} strokeWidth={3} fill="currentColor" />
                {Number(venue.rating).toFixed(1)}
              </span>
            )}
            {venue.price_level !== undefined &&
              venue.price_level !== null && (
                <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded-full border border-black/5">
                  {'£'.repeat(Math.max(1, Math.min(4, Number(venue.price_level) || 1)))}
                </span>
              )}
            {sponsorClass && (
              <span
                className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border-2 shadow-sm ${sponsorClass}`}
              >
                {venue.sponsor_tier}
              </span>
            )}
            {venue.features?.slice(0, isGold ? 4 : 2).map((f) => (
              <span
                key={f}
                className={`inline-flex items-center text-[10px] font-bold bg-white text-on-surface-variant border border-outline-variant px-2 py-0.5 rounded-lg shadow-sm`}
              >
                {FEATURE_LABELS[f] ?? f.replace(/_/g, ' ')}
              </span>
            ))}
            {venue.features && venue.features.length > (isGold ? 4 : 2) && (
              <span className="inline-flex items-center text-[10px] font-black text-outline uppercase tracking-wider ml-1">
                +{venue.features.length - (isGold ? 4 : 2)} more
              </span>
            )}
          </div>
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
        className={`flex-shrink-0 self-start mt-1 w-10 h-10 rounded-2xl ${isGold ? 'bg-amber-200 text-amber-900 border-amber-300' : 'bg-surface-container text-on-surface-variant'} border border-black/5 hover:bg-primary-container hover:text-on-primary-container flex items-center justify-center transition-all active:scale-90`}
        aria-label={`View full details for ${venue.name}`}
        title="View full details"
      >
        <ArrowUpRight size={20} strokeWidth={3} />
      </Link>
    </article>
  );
}
