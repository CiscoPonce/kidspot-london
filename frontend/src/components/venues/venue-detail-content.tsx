'use client';

import { VenueMapSnippet } from '@/components/map/venue-map-snippet';
import { ShareButton } from '@/components/venues/share-button';
import type { Venue, VenueDetails } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Validate a URL string before rendering as a link (T-04-05-02) */
export function isValidUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Validate a phone string before rendering as a tel: link */
export function isValidPhone(phone?: string): boolean {
  if (!phone) return false;
  // Allow digits, spaces, +, -, (, )
  return /^[\d\s\+\-\(\)]{7,}$/.test(phone.trim());
}

// ─── Sponsor tier badge ───────────────────────────────────────────────────────

const TIER_STYLES: Record<string, string> = {
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-300',
  bronze: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function SponsorBadge({ tier }: { tier: string }) {
  const styles = TIER_STYLES[tier] ?? TIER_STYLES.bronze;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${styles}`}
    >
      {tier}
    </span>
  );
}

// ─── Venue type badge ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  softplay: 'Soft Play',
  community_hall: 'Community Hall',
  park: 'Park',
  other: 'Other',
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-100 border border-primary-200 px-2 py-0.5 text-xs font-medium text-primary-800 capitalize">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function VenueLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-6 w-2/3 rounded bg-secondary-200" />
      <div className="h-[150px] w-full rounded-lg bg-secondary-200" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-secondary-200" />
        <div className="h-4 w-4/5 rounded bg-secondary-200" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 rounded-lg bg-secondary-200" />
        <div className="h-10 flex-1 rounded-lg bg-secondary-200" />
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function VenueErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="mb-1 text-sm font-medium text-secondary-900">Details unavailable</p>
      <p className="mb-4 text-xs text-secondary-500">Could not load venue details. Please try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 active:scale-[0.98] transition-all"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Venue detail content ─────────────────────────────────────────────────────

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

  return (
    <>
      {/* Drag handle for mobile (only if in modal) */}
      {showCloseButton && (
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-secondary-300" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-secondary-900">{venue.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={venue.type} />
            {venue.sponsor_tier && <SponsorBadge tier={venue.sponsor_tier} />}
          </div>
        </div>
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-4 pb-6">
        {isLoading ? (
          <VenueLoadingSkeleton />
        ) : isError ? (
          <>
            <div className="mb-4">
              <VenueMapSnippet lat={venue.lat} lon={venue.lon} name={venue.name} />
            </div>
            {onRetry && <VenueErrorState onRetry={onRetry} />}
          </>
        ) : (
          <>
            {/* Map snippet */}
            <div className="mb-4">
              <VenueMapSnippet lat={venue.lat} lon={venue.lon} name={venue.name} />
            </div>

            {/* Details */}
            {(address || (venue as Venue).distance_miles !== undefined) && (
              <div className="mb-4 space-y-2 rounded-lg bg-secondary-50 p-3">
                {address && (
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-secondary-700">{address}</span>
                  </div>
                )}
                {(venue as Venue).distance_miles !== undefined && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span className="text-sm text-secondary-700">
                      {(venue as Venue).distance_miles?.toFixed(1)} miles away
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {isValidPhone(phone) && (
                <a
                  href={`tel:${phone!.trim()}`}
                  className="flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 active:scale-[0.98] transition-all"
                  aria-label={`Call ${venue.name}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </a>
              )}
              {isValidUrl(website) && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 active:scale-[0.98] transition-all"
                  aria-label={`Visit ${venue.name} website`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </a>
              )}
              <ShareButton 
                title={venue.name} 
                className="flex-1 min-w-[100px] justify-center py-2.5"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
