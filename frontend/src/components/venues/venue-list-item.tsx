'use client';

import { Trees, Building, Joystick, Dumbbell, MapPin } from 'lucide-react';
import type { Venue } from '@/lib/api';

interface VenueListItemProps {
  venue: Venue;
  distance: number;
  onTap: () => void;
  isHighlighted?: boolean;
}

const TYPE_ICONS = {
  park: Trees,
  community_hall: Building,
  softplay: Joystick,
  sports_centre: Dumbbell,
  other: MapPin,
} as const;

type VenueType = keyof typeof TYPE_ICONS;

function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

export function VenueListItem({ venue, distance, onTap, isHighlighted }: VenueListItemProps) {
  const IconComponent = TYPE_ICONS[(venue.type as VenueType) || 'other'];

  return (
    <button
      type="button"
      onClick={onTap}
      className={`
        w-full flex items-center gap-3 px-3 py-3 rounded-lg
        min-h-[56px] touch-manipulation transition-all duration-150
        ${
          isHighlighted
            ? 'bg-primary-50 border border-primary-200'
            : 'hover:bg-secondary-50 active:bg-secondary-100'
        }
      `}
    >
      {/* Icon */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isHighlighted ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-secondary-600'}
        `}
      >
        <IconComponent size={16} />
      </div>

      {/* Name and Type */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-secondary-900 truncate">
          {venue.name}
        </p>
        <p className="text-xs text-secondary-500 capitalize">
          {venue.type.replace('_', ' ')}
        </p>
      </div>

      {/* Distance */}
      <div className="flex-shrink-0 text-right">
        <span className="text-xs font-medium text-primary-600">
          {formatDistance(distance)}
        </span>
      </div>
    </button>
  );
}