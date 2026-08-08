'use client';

import { Building2, Joystick, Landmark, MapPin, Trees } from 'lucide-react';
import { venueTypeGradient } from '@/lib/venue-images';

const TYPE_ICONS: Record<string, typeof MapPin> = {
  softplay: Joystick,
  leisure_centre: Building2,
  community_hall: Building2,
  museum: Landmark,
  park: Trees,
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
  const Icon = TYPE_ICONS[type || ''] || MapPin;
  const gradient = venueTypeGradient(type);

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${gradient} ${className}`}
      aria-label={`No photo available for ${name}`}
    >
      <Icon size={48} strokeWidth={1.25} className="text-[#8E8B7B]/80" />
      <span className="mt-2 px-4 text-center text-xs font-semibold text-[#5E5E5E]">
        Photo coming soon
      </span>
    </div>
  );
}
