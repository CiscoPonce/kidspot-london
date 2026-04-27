'use client';

import { VenueMapSnippet } from '@/components/map/venue-map-snippet';
import { ShareButton } from '@/components/venues/share-button';
import type { Venue, VenueDetails } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-[8px] text-xs font-bold uppercase border border-secondary-200">
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
            <div className="mb-8 space-y-4">
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

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {isValidPhone(phone) && (
                  <a
                    href={`tel:${phone!.trim()}`}
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
          </>
        )}
      </div>
    </div>
  );
}
