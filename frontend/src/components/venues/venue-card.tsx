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
  const IconComponent = TYPE_ICONS[(venue.type as VenueType) || 'other'];
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
        w-full text-left p-4 rounded-lg border transition-all duration-150
        min-h-[72px] touch-manipulation cursor-pointer group
        ${
          isSelected
            ? 'border-primary-500 bg-primary-50 shadow-md'
            : 'border-secondary-200 bg-white hover:border-primary-300 hover:shadow-sm active:scale-[0.98]'
        }
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-secondary-600'}
          `}
        >
          <IconComponent size={20} />
        </div>

        {/* Venue Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-secondary-900 truncate">{venue.name}</h3>
            {sponsorBadge && (
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase
                  ${sponsorBadge}
                `}
              >
                {venue.sponsor_tier}
              </span>
            )}
          </div>
          <p className="text-sm text-secondary-500 capitalize mt-0.5">
            {venue.type.replace('_', ' ')}
          </p>
        </div>

        {/* Distance & Link */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-sm font-medium text-primary-600">
            {formatDistance(distance)}
          </span>
          <Link
            href={`/venue/${venue.slug}`}
            onClick={handleLinkClick}
            className="p-1 rounded-md text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="View full details"
          >
            <ExternalLink size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
