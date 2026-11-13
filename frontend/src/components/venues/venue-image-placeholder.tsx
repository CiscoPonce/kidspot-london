'use client';

import { venueTypeGradient } from '@/lib/venue-images';

const TYPE_LABEL: Record<string, string> = {
  softplay: 'Soft play',
  community_hall: 'Hall',
  leisure_centre: 'Activity',
  park: 'Outdoor',
  museum: 'Museum',
  library: 'Library',
  cafe: 'Café',
};

interface VenueImagePlaceholderProps {
  type?: string;
  name: string;
  className?: string;
}

export function VenueImagePlaceholder({
  type,
  name,
  className = '',
}: VenueImagePlaceholderProps) {
  const gradient = venueTypeGradient(type);
  const initial = (name || '?').replace(/^the\s+/i, '').charAt(0).toUpperCase();

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${gradient} ${className}`}
      aria-hidden="true"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/5">
        <span className="font-display text-2xl font-semibold text-brand-dark">{initial}</span>
      </div>
      <span className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-brand-dark/60">
        {TYPE_LABEL[type || ''] || 'Venue'}
      </span>
    </div>
  );
}
