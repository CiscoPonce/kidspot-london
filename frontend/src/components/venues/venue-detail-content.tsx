'use client';

import { VenueMapSnippet } from '@/components/map/venue-map-snippet';
import { ShareButton } from '@/components/venues/share-button';
import Link from 'next/link';
import { trackVenueClick, type Venue, type VenueDetails, type YelpReview } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTime(time: string): string {
  if (time.length !== 4) return time;
  const hours = parseInt(time.slice(0, 2), 10);
  const minutes = time.slice(2);
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}${ampm}`;
}

export function isValidUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidPhone(phone?: string): boolean {
  if (!phone) return false;
  return /^[\d\s\+\-\(\)]{7,}$/.test(phone.trim());
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export function OpenStatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
      isOpen 
        ? 'bg-green-100 text-green-700 border-green-200' 
        : 'bg-red-100 text-red-700 border-red-200'
    }`}>
      {isOpen ? 'Open Now' : 'Closed'}
    </span>
  );
}

export function SponsorBadge({ tier }: { tier: string }) {
  return (
    <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-[8px] text-xs font-bold uppercase">
      {tier}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    softplay: 'Soft Play',
    community_hall: 'Community Hall',
    park: 'Park',
    other: 'Other',
  };
  
  return (
    <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-[8px] text-xs font-bold uppercase">
      {labels[type] ?? type.replace('_', ' ')}
    </span>
  );
}

export function FeatureBadge({ feature }: { feature: string }) {
  const labels: Record<string, string> = {
    soft_play: 'Soft Play',
    party_hire: 'Party Hire',
    cafe: 'Cafe',
    wheelchair_accessible: 'Wheelchair',
    parking: 'Parking',
  };
  
  return (
    <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-[8px] text-xs font-bold uppercase border border-outline-variant">
      {labels[feature] ?? feature.replace('_', ' ')}
    </span>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

export function VenueLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="h-8 w-3/4 bg-surface-variant rounded-lg" />
      <div className="h-[200px] w-full bg-surface-variant rounded-[16px]" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-surface-variant rounded" />
        <div className="h-4 w-5/6 bg-surface-variant rounded" />
      </div>
    </div>
  );
}

export function VenueErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-error bg-error-container rounded-[24px]">
      <span className="material-symbols-outlined text-4xl text-error mb-4">warning</span>
      <p className="font-title-sm text-error uppercase mb-2">Sync Interrupted</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-on-error-container text-white px-6 py-2 rounded-full font-label-caps text-label-caps uppercase hover:opacity-90 transition-opacity"
      >
        RETRY
      </button>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function OpeningHours({ hours }: { hours: NonNullable<VenueDetails['opening_hours']> }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <div className="mt-6 p-5 bg-surface rounded-[24px] border border-outline-variant">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-outline">schedule</span>
          Opening Hours
        </h3>
        <OpenStatusBadge isOpen={hours.is_open_now} />
      </div>
      <div className="space-y-2.5">
        {days.map((dayName, index) => {
          // Yelp 0 is Monday
          const dayHours = hours.open.filter(h => h.day === index);
          const isToday = new Date().getDay() === (index + 1) % 7;
          return (
            <div key={dayName} className="flex justify-between text-sm">
              <span className={isToday ? 'font-bold text-on-surface' : 'text-on-surface-variant'}>
                {dayName}
              </span>
              <span className="text-on-surface">
                {dayHours.length > 0 
                  ? dayHours.map(h => `${formatTime(h.start)} – ${formatTime(h.end)}`).join(', ')
                  : 'Closed'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewsList({ reviews }: { reviews: YelpReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <div className="mt-8 space-y-6">
      <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-outline">rate_review</span>
        Community Reviews
      </h3>
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="p-4 bg-surface rounded-[20px] border border-outline-variant">
            <div className="flex items-center gap-3 mb-3">
              {review.user.image_url ? (
                <img 
                  src={review.user.image_url} 
                  alt={review.user.name} 
                  className="w-8 h-8 rounded-full object-cover bg-surface-variant" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold">
                  {review.user.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface truncate">{review.user.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {'★'.repeat(Math.floor(review.rating))}
                    {'☆'.repeat(5 - Math.floor(review.rating))}
                  </div>
                  <span className="text-[10px] text-outline font-medium">
                    {new Date(review.time_created).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">
              "{review.text}"
            </p>
            <a 
              href={review.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
            >
              Read full review on Yelp
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface VenueDetailContentProps {
  venue: Venue | VenueDetails;
  details?: VenueDetails;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function VenueDetailContent({
  venue,
  details,
  isLoading,
  isError,
  onRetry,
  onClose,
  showCloseButton = true,
}: VenueDetailContentProps) {
  const mergedDetails = details || (venue as VenueDetails);
  const phone = mergedDetails.phone;
  const website = mergedDetails.website;
  const address = mergedDetails.address;
  const hours = mergedDetails.opening_hours;
  const reviews = mergedDetails.reviews;

  return (
    <div className="bg-surface-container-lowest rounded-t-[32px] sm:rounded-[32px] overflow-hidden">
      {/* Mobile drag handle */}
      {showCloseButton && (
        <div className="flex justify-center pt-4 pb-2 sm:hidden">
          <div className="h-1.5 w-12 bg-on-surface opacity-10 rounded-full" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-6">
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
            {venue.name}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <TypeBadge type={venue.type} />
            {venue.sponsor_tier && <SponsorBadge tier={venue.sponsor_tier} />}
            {venue.rating && (
              <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-[8px] text-xs font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">star</span>
                {Number(venue.rating).toFixed(1)}
              </span>
            )}
            {venue.price_level !== undefined && venue.price_level !== null && (
              <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-[8px] text-xs font-bold uppercase flex items-center gap-0.5">
                {'£'.repeat(Number(venue.price_level) || 1)}
              </span>
            )}
            {venue.features && venue.features.map(f => (
              <FeatureBadge key={f} feature={f} />
            ))}
          </div>
        </div>
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close venue details"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-6 pb-8 max-h-[70vh]">
        {isLoading ? (
          <VenueLoadingSkeleton />
        ) : isError ? (
          <>
            <div className="mb-6 rounded-[24px] overflow-hidden border border-outline-variant">
              <VenueMapSnippet lat={venue.lat || 51.5074} lon={venue.lon || -0.1278} name={venue.name} />
            </div>
            {onRetry && <VenueErrorState onRetry={onRetry} />}
          </>
        ) : (
          <>
            {/* Map */}
            <div className="mb-6 rounded-[24px] overflow-hidden border border-outline-variant">
              <VenueMapSnippet lat={venue.lat || 51.5074} lon={venue.lon || -0.1278} name={venue.name} />
            </div>

            {/* Address & Info */}
            <div className="mb-6 space-y-4">
              {address && (
                <div className="flex items-start gap-3 p-4 bg-surface rounded-[16px] border border-outline-variant">
                  <span className="material-symbols-outlined text-outline">location_on</span>
                  <span className="font-body-md text-body-md text-on-surface">{address}</span>
                </div>
              )}
              {(venue as Venue).distance_miles !== undefined && (
                <div className="flex items-center gap-3 p-4 bg-surface rounded-[16px] border border-outline-variant">
                  <span className="material-symbols-outlined text-outline">distance</span>
                  <span className="font-title-sm text-title-sm text-on-surface">
                    {(venue as Venue).distance_miles?.toFixed(1)} miles away
                  </span>
                </div>
              )}
            </div>

            {/* Opening Hours */}
            {hours && hours.open && <OpeningHours hours={hours} />}

            {/* Reviews */}
            {reviews && <ReviewsList reviews={reviews} />}

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {isValidPhone(phone) && (
                  <a
                    href={`tel:${phone!.trim()}`}
                    onClick={() => trackVenueClick(venue.id, 'phone')}
                    aria-label={`Call ${venue.name} at ${phone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 text-white h-[56px] rounded-[16px] font-title-sm text-title-sm active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined">call</span>
                    Call Now
                  </a>
                )}
                {isValidUrl(website) && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackVenueClick(venue.id, 'website')}
                    aria-label={`Visit ${venue.name} website`}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary-container text-on-primary-container h-[56px] rounded-[16px] font-title-sm text-title-sm active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined">language</span>
                    Website
                  </a>
                )}
              </div>
              <ShareButton 
                title={venue.name} 
                className="flex items-center justify-center gap-2 bg-surface border border-outline-variant h-[56px] rounded-[16px] font-title-sm text-title-sm active:scale-95 transition-transform"
              />
            </div>

            {/* Claim Listing CTA */}
            {(!mergedDetails.current_claim_status || mergedDetails.current_claim_status === 'unclaimed') && (
              <div className="mt-10 pt-8 border-t border-outline-variant text-center">
                <p className="text-sm text-on-surface-variant mb-4">
                  Own this venue? Claim it to manage details and reach more parents.
                </p>
                <Link
                  href={`/claim/${venue.slug}`}
                  className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:brightness-90 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                  Claim this listing
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
