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
      className={`group overflow-hidden rounded-2xl border bg-white text-left transition ${
        featured ? 'sm:flex' : ''
      } ${
        isSelected
          ? 'border-brand-dark shadow-sm'
          : 'border-brand-border hover:-translate-y-0.5 hover:border-brand-dark/30 hover:shadow-md'
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden bg-brand-cream-dark ${
          featured ? 'aspect-[16/10] sm:aspect-auto sm:h-auto sm:w-[46%]' : 'aspect-[16/10]'
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <VenueImagePlaceholder type={venue.type} name={venue.name} />
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-dark">
          {typeLabel}
        </span>
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from shortlist` : `Add ${venue.name} to shortlist`}
          className="absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm"
        >
          <Heart
            size={16}
            strokeWidth={2.2}
            className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-brand-muted'}
          />
        </button>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col justify-between p-3.5 ${featured ? 'sm:p-5' : ''}`}>
        <div>
          {placeLine && (
            <p className="text-xs font-medium text-brand-muted">{placeLine}</p>
          )}
          <h3
            className={`mt-0.5 font-semibold leading-snug text-brand-dark ${
              featured ? 'text-xl sm:text-2xl' : 'line-clamp-2 text-base'
            }`}
          >
            {venue.name}
          </h3>
          <p className="mt-1.5 text-sm text-brand-dark">
            <span className="font-semibold">{partyPrice || 'Call for price'}</span>
            {venue.party_max_capacity != null && (
              <span className="text-brand-muted"> · up to {venue.party_max_capacity} kids</span>
            )}
          </p>
          <PartyCateringBadge venue={venue} compact />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-yellow-hover"
            >
              Call {phone}
            </a>
          ) : (
            <span className="rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white">
              View details
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
