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
      <span className="font-display text-4xl font-semibold text-brand-dark/70">{initial}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand-dark/50">
        {TYPE_LABEL[type || ''] || 'Venue'}
      </span>
    </div>
  );
}
