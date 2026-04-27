'use client';

import Link from 'next/link';
import { Trees, Building, Joystick, Dumbbell, MapPin, ExternalLink } from 'lucide-react';
import type { Venue } from '@/lib/api';
import { usePlausible } from 'next-plausible';

interface VenueCardProps {
  venue: Venue;
  distance: number;
  onSelect: () => void;
  isSelected?: boolean;
}

const TYPE_ICONS = {
  park: Trees,
  community_hall: Building,
  softplay: Joystick,
  sports_centre: Dumbbell,
  other: MapPin,
} as const;

type VenueType = keyof typeof TYPE_ICONS;

const SPONSOR_BADGE_COLORS = {
  gold: 'bg-amber-400 text-amber-900',
  silver: 'bg-slate-300 text-slate-700',
  bronze: 'bg-orange-600 text-orange-100',
} as const;

function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} miles`;
}

export function VenueCard({ venue, distance, onSelect, isSelected }: VenueCardProps) {
  const IconComponent = (TYPE_ICONS[venue.type as VenueType] || TYPE_ICONS.other) as any;
  const sponsorBadge = venue.sponsor_tier
    ? SPONSOR_BADGE_COLORS[venue.sponsor_tier as keyof typeof SPONSOR_BADGE_COLORS]
    : null;
  const plausible = usePlausible();

  const handleCardClick = () => {
    plausible('VenueSelected', { props: { venueId: venue.id, source: 'card_click' } });
    onSelect();
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    plausible('VenueViewed', { props: { venueId: venue.id, source: 'external_link' } });
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        w-full text-left p-5 rounded-[2rem] premium-card group cursor-pointer
        ${isSelected ? 'ring-2 ring-primary border-transparent' : 'border border-border/50'}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div
          className={`
            flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300
            ${isSelected ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-secondary-800 text-secondary-400 group-hover:bg-secondary-700'}
          `}
        >
          <IconComponent size={24} strokeWidth={2.5} />
        </div>

        {/* Venue Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-text-main group-hover:text-primary transition-colors truncate">
              {venue.name}
            </h3>
            {sponsorBadge && (
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest
                  ${sponsorBadge}
                `}
              >
                {venue.sponsor_tier}
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {venue.type.replace('_', ' ')}
          </p>
          <div className="flex items-center gap-3 mt-3">
            {venue.rating && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-400/10 rounded-lg">
                <span className="text-amber-400 text-xs">★</span>
                <span className="text-amber-400 text-xs font-black">{Number(venue.rating).toFixed(1)}</span>
              </div>
            )}
            {venue.price_level !== undefined && (
              <div className="flex items-center gap-0.5 px-2 py-1 bg-secondary-800 rounded-lg">
                <span className="text-primary text-[10px] font-black">
                  {'£'.repeat(Number(venue.price_level) || 1)}
                </span>
              </div>
            )}
            {venue.features && venue.features.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {venue.features.slice(0, 3).map(f => (
                  <span key={f} className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {f.replace('_', ' ')}
                  </span>
                ))}
                {venue.features.length > 3 && (
                  <span className="px-2 py-1 bg-secondary-800 text-secondary-400 rounded-lg text-[9px] font-black tracking-widest">
                    +{venue.features.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Distance & Link */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div className="px-2 py-1 bg-secondary-800 rounded-lg border border-border">
            <span className="text-[10px] font-black text-text-main">
              {formatDistance(distance)}
            </span>
          </div>
          <Link
            href={`/venue/${venue.slug}`}
            onClick={handleLinkClick}
            className="p-2 rounded-xl text-secondary-400 hover:text-primary hover:bg-primary/10 transition-all duration-200"
            title="View full details"
          >
            <ExternalLink size={18} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
