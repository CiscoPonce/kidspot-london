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

  // Use a placeholder image if none available
  const backgroundImage = venue.image_url || `https://images.unsplash.com/photo-1533749047139-189de3cf06d3?q=80&w=800&auto=format&fit=crop`;

  return (
    <div
      onClick={handleCardClick}
      className={`
        relative w-full h-[400px] overflow-hidden group cursor-pointer border-2 transition-all duration-300
        ${isSelected ? 'border-renault-blue' : 'border-transparent'}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url('${backgroundImage}')` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 promo-overlay" />
      
      {/* Content */}
      <div className="absolute inset-0 p-card-padding flex flex-col justify-between">
        <h4 className="font-card-heading text-card-heading text-pure-white uppercase tracking-tighter">
          {venue.name}
        </h4>
        
        <div>
          <div className="flex flex-col gap-2 items-start mb-6">
            <div className="bg-absolute-black text-pure-white inline-block px-4 py-2 font-body-bold text-body-bold uppercase">
              {venue.type.replace('_', ' ')}
            </div>
            <div className="bg-pure-white text-absolute-black inline-block px-4 py-2 font-body-bold text-body-bold uppercase">
              {formatDistance(distance)}
            </div>
          </div>
          
          <button 
            className="w-full bg-renault-yellow text-absolute-black font-button-label text-button-label px-button-x py-button-y min-h-[touch-target-min] uppercase hover:bg-renault-blue hover:text-pure-white transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            VIEW DETAILS
          </button>
        </div>
      </div>
    </div>
  );
}
