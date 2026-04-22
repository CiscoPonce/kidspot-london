'use client';

import Link from 'next/link';
import type { Venue } from '@/lib/api';
import { usePlausible } from 'next-plausible';

interface VenueCardProps {
  venue: Venue;
  distance: number;
  onSelect: () => void;
  isSelected?: boolean;
}

function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} miles away`;
}

export function VenueCard({ venue, distance, onSelect, isSelected }: VenueCardProps) {
  const plausible = usePlausible();

  const handleCardClick = () => {
    plausible('VenueSelected', { props: { venueId: venue.id, source: 'card_click' } });
    onSelect();
  };

  const backgroundImage = venue.image_url || `https://images.unsplash.com/photo-1533749047139-189de3cf06d3?q=80&w=800&auto=format&fit=crop`;

  return (
    <div
      onClick={handleCardClick}
      className={`
        bg-surface-container-lowest rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] 
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300 
        overflow-hidden flex flex-col group cursor-pointer border-2
        ${isSelected ? 'border-primary-container' : 'border-transparent'}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      {/* Padded Image Container */}
      <div className="relative h-48 w-full p-2">
        <img 
          src={backgroundImage} 
          alt={venue.name}
          className="w-full h-full object-cover rounded-[12px]"
        />
        <button 
          className="absolute top-4 right-4 bg-white/80 p-2 rounded-full backdrop-blur-sm text-secondary hover:text-error transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            favorite
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <h3 className="font-title-sm text-title-sm text-on-surface">
            {venue.name}
          </h3>
          <span className="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded text-xs font-bold">
            {venue.sponsor_tier === 'gold' ? '4.9 ★' : '4.5 ★'}
          </span>
        </div>
        
        <p className="font-body-md text-body-md text-on-surface-variant capitalize">
          {venue.type.replace('_', ' ')}
        </p>

        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1 text-on-secondary-container text-sm">
            <span className="material-symbols-outlined text-sm">payments</span>
            From £15/child
          </div>
          <div className="flex items-center gap-1 text-on-secondary-container text-sm">
            <span className="material-symbols-outlined text-sm">location_on</span>
            {formatDistance(distance)}
          </div>
        </div>
      </div>
    </div>
  );
}
