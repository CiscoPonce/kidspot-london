'use client';

import { useEffect, useRef, useState } from 'react';
import { VenueImagePlaceholder } from '@/components/venues/venue-image-placeholder';
import { PartyCateringBadge } from '@/components/venues/party-catering-badge';
import { usePlausible } from 'next-plausible';
import type { Venue } from '@/lib/api';
import { Heart, Phone } from 'lucide-react';
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
  const [imgFailed, setImgFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgFailed(true);
    }
  }, [imageUrl]);
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
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition duration-200 ${
        featured ? 'sm:grid sm:grid-cols-12' : ''
      } ${
        isSelected
          ? 'border-brand-dark ring-2 ring-brand-dark'
          : 'border-brand-border hover:-translate-y-0.5 hover:border-brand-dark/30 hover:shadow-md'
      }`}
    >
      <div
        className={`relative overflow-hidden bg-brand-cream-dark ${
          featured ? 'aspect-[16/10] sm:col-span-6 sm:aspect-auto sm:min-h-[210px]' : 'aspect-[16/10]'
        }`}
      >
        {imageUrl && !imgFailed ? (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={venue.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <VenueImagePlaceholder type={venue.type} name={venue.name} />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark shadow-sm">
          {typeLabel}
        </span>

        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${venue.name} from shortlist` : `Add ${venue.name} to shortlist`}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105"
        >
          <Heart
            size={16}
            strokeWidth={2.2}
            className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-brand-muted'}
          />
        </button>
      </div>

      <div className={`flex flex-1 flex-col justify-between p-4 ${featured ? 'sm:col-span-6 sm:p-5' : ''}`}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {placeLine ? (
              <p className="text-xs font-medium text-brand-muted">{placeLine}</p>
            ) : (
              <span />
            )}
            {featured && (
              <span className="rounded-full bg-brand-yellow/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-dark">
                Top match
              </span>
            )}
          </div>

          <h3
            className={`mt-1 font-display font-semibold leading-snug text-brand-dark ${
              featured ? 'text-xl sm:text-2xl' : 'line-clamp-2 text-lg'
            }`}
          >
            {venue.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-brand-dark">
              {partyPrice || 'Price on enquiry'}
            </span>
            {venue.party_max_capacity != null && (
              <span className="text-brand-muted">· Up to {venue.party_max_capacity} kids</span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <PartyCateringBadge venue={venue} compact />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-brand-border/70 pt-3">
          <span className="text-xs font-semibold text-brand-dark group-hover:underline">
            View details →
          </span>
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-yellow-hover"
            >
              <Phone size={12} strokeWidth={2.3} />
              <span>{phone}</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
