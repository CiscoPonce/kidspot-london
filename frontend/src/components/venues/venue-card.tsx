'use client';

import { VenueImagePlaceholder } from '@/components/venues/venue-image-placeholder';
import { PartyCateringBadge } from '@/components/venues/party-catering-badge';
import { usePlausible } from 'next-plausible';
import type { Venue } from '@/lib/api';
import { Heart } from 'lucide-react';
import { formatPartyPrice } from '@/lib/venue-images';
import { displayPhone } from '@/lib/display-phone';
import { useShortlist } from '@/hooks/use-shortlist';

interface VenueCardProps {
  venue: Venue;
  distance: number;
  onSelect: () => void;
  isSelected?: boolean;
  featured?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  softplay: 'Soft play',
  community_hall: 'Hall hire',
  leisure_centre: 'Leisure centre',
  park: 'Outdoor',
  museum: 'Museum',
  library: 'Library',
  cafe: 'Café',
};

function formatDistance(miles: number): string {
  if (miles == null || Number.isNaN(miles) || miles <= 0) return '';
  return miles < 0.1 ? '<0.1 mi' : `${miles.toFixed(1)} mi`;
}

function firstImage(venue: Venue): string | undefined {
  if (venue.image_url) return venue.image_url;
  if (Array.isArray(venue.images) && venue.images.length > 0) return venue.images[0];
  return undefined;
}

export function VenueCard({
  venue,
  distance,
  onSelect,
  isSelected,
  featured = false,
}: VenueCardProps) {
  const plausible = usePlausible();
  const { has, toggle } = useShortlist();
  const isSaved = has(venue.id);
  const imageUrl = firstImage(venue);
  const partyPrice = formatPartyPrice(venue);
  const typeLabel = TYPE_LABEL[venue.type] || 'Venue';
  const phone = displayPhone(venue.phone);
  const placeLine = [formatDistance(distance), venue.borough].filter(Boolean).join(' · ');

  const handleCardClick = () => {
    plausible('VenueSelected', {
      props: { venueId: venue.id, source: 'card_click' },
    });
    onSelect();
  };

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(venue);
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
      className={`group relative overflow-hidden rounded-3xl text-left shadow-sm transition duration-300 ${
        isSelected ? 'ring-2 ring-brand-dark' : 'hover:-translate-y-1 hover:shadow-xl'
      }`}
    >
      <div
        className={`relative overflow-hidden bg-brand-cream-dark ${
          featured ? 'aspect-[16/10] sm:aspect-[21/9]' : 'aspect-[4/5] sm:aspect-[4/3]'
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
        ) : (
          <VenueImagePlaceholder type={venue.type} name={venue.name} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark">
          {typeLabel}
        </span>
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from shortlist` : `Add ${venue.name} to shortlist`}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm"
        >
          <Heart
            size={16}
            strokeWidth={2.2}
            className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-brand-muted'}
          />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          {placeLine && (
            <p className="text-xs font-medium text-white/75">{placeLine}</p>
          )}
          <h3
            className={`mt-0.5 font-display font-semibold leading-tight ${
              featured ? 'text-2xl sm:text-4xl' : 'line-clamp-2 text-xl'
            }`}
          >
            {venue.name}
          </h3>
          <p className="mt-1.5 text-sm text-white/90">
            <span className="font-semibold">{partyPrice || 'Call for price'}</span>
            {venue.party_max_capacity != null && (
              <span className="text-white/70"> · up to {venue.party_max_capacity} kids</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-brand-yellow px-3.5 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-yellow-hover"
              >
                Call {phone}
              </a>
            ) : (
              <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-dark">
                View details
              </span>
            )}
            <PartyCateringBadge venue={venue} compact />
          </div>
        </div>
      </div>
    </article>
  );
}
