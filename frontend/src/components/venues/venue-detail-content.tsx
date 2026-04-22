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
  const styles = tier === 'gold' 
    ? 'bg-renault-yellow text-absolute-black' 
    : 'bg-absolute-black text-pure-white';
    
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-body-bold uppercase ${styles}`}>
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
    <span className="inline-flex items-center bg-pure-white border border-absolute-black px-3 py-1 text-xs font-body-bold text-absolute-black uppercase">
      {labels[type] ?? type.replace('_', ' ')}
    </span>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

export function VenueLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="h-8 w-3/4 bg-secondary-fixed-dim" />
      <div className="h-[200px] w-full bg-secondary-fixed-dim border-2 border-absolute-black" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-secondary-fixed-dim" />
        <div className="h-4 w-5/6 bg-secondary-fixed-dim" />
      </div>
    </div>
  );
}

export function VenueErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-error bg-error-container">
      <span className="material-symbols-outlined text-4xl text-error mb-4">warning</span>
      <p className="font-section-heading text-lg text-error uppercase mb-2">LINK INTERRUPTED</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-absolute-black text-pure-white px-6 py-2 font-button-label text-button-label uppercase hover:bg-error transition-colors"
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
    <div className="bg-pure-white border-2 border-absolute-black">
      {/* Mobile drag handle placeholder */}
      {showCloseButton && (
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 bg-absolute-black opacity-20" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-6 border-b border-absolute-black">
        <div className="min-w-0 flex-1">
          <h2 className="font-card-heading text-card-heading text-absolute-black uppercase tracking-tighter leading-none">
            {venue.name}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <TypeBadge type={venue.type} />
            {venue.sponsor_tier && <SponsorBadge tier={venue.sponsor_tier} />}
          </div>
        </div>
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-absolute-black text-absolute-black hover:bg-absolute-black hover:text-pure-white transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-6 py-6 max-h-[70vh]">
        {isLoading ? (
          <VenueLoadingSkeleton />
        ) : isError ? (
          <>
            <div className="mb-6 border-2 border-absolute-black">
              <VenueMapSnippet lat={venue.lat} lon={venue.lon} name={venue.name} />
            </div>
            {onRetry && <VenueErrorState onRetry={onRetry} />}
          </>
        ) : (
          <>
            {/* Map */}
            <div className="mb-6 border-2 border-absolute-black">
              <VenueMapSnippet lat={venue.lat} lon={venue.lon} name={venue.name} />
            </div>

            {/* Address & Distance */}
            {(address || (venue as Venue).distance_miles !== undefined) && (
              <div className="mb-8 p-4 bg-surface-container border border-absolute-black">
                {address && (
                  <div className="flex items-start gap-3 mb-3">
                    <span className="material-symbols-outlined text-absolute-black">location_on</span>
                    <span className="font-body-text text-absolute-black uppercase">{address}</span>
                  </div>
                )}
                {(venue as Venue).distance_miles !== undefined && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-absolute-black">distance</span>
                    <span className="font-body-bold text-renault-blue uppercase">
                      {(venue as Venue).distance_miles?.toFixed(1)} MILES FROM ORIGIN
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              {isValidPhone(phone) && (
                <a
                  href={`tel:${phone!.trim()}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-absolute-black text-pure-white h-[touch-target-min] font-button-label text-button-label uppercase hover:bg-renault-blue transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">call</span>
                  <span>Direct Line</span>
                </a>
              )}
              {isValidUrl(website) && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-renault-yellow text-absolute-black h-[touch-target-min] font-button-label text-button-label uppercase hover:bg-renault-blue hover:text-pure-white transition-colors border border-absolute-black"
                >
                  <span className="material-symbols-outlined text-xl">language</span>
                  <span>Website</span>
                </a>
              )}
              <ShareButton 
                title={venue.name} 
                className="flex-1 flex items-center justify-center gap-2 border-2 border-absolute-black h-[touch-target-min] font-button-label text-button-label uppercase hover:bg-gray-100 transition-colors"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
