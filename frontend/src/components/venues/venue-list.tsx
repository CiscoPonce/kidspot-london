'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearch } from '@/hooks/use-search';
import { fetchVenues } from '@/lib/api';
import { VenueCard } from './venue-card';
import type { Venue } from '@/lib/api';

interface VenueListProps {
  onVenueSelect: (venue: Venue) => void;
  selectedId?: number;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-grid-gap">
      {[1, 2, 4, 5].map((i) => (
        <div
          key={i}
          className="h-[400px] border-2 border-border-gray bg-secondary-fixed-dim animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-border-gray">
      <span className="material-symbols-outlined text-6xl text-secondary-brand mb-6">
        search_off
      </span>
      <h3 className="font-section-heading text-2xl text-absolute-black uppercase mb-2">
        NO VENUES DETECTED
      </h3>
      <p className="font-body-text text-secondary-brand uppercase max-w-sm">
        Try expanding your search radius or scanning a different sector
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-error">
      <span className="material-symbols-outlined text-6xl text-error mb-6">
        warning
      </span>
      <h3 className="font-section-heading text-2xl text-error uppercase mb-2">
        DATA LINK FAILURE
      </h3>
      <p className="font-body-text text-error uppercase mb-8">
        Unable to sync with venue database
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-8 py-3 bg-absolute-black text-pure-white font-button-label text-button-label uppercase hover:bg-renault-blue transition-colors"
      >
        RETRY SYNC
      </button>
    </div>
  );
}

export function VenueList({ onVenueSelect, selectedId }: VenueListProps) {
  const { lat, lon, radius, venueType } = useSearch();

  const { data: venuesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType],
    queryFn: () => fetchVenues(lat!, lon!, radius, venueType || undefined),
    enabled: lat !== null && lon !== null,
  });

  const venues = venuesResponse?.all || [];

  // Sort venues by distance (nearest first)
  const sortedVenues = venues.length > 0
    ? [...venues].sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
    : [];

  if (!lat || !lon) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-border-gray bg-surface-container">
        <span className="material-symbols-outlined text-6xl text-absolute-black mb-6">
          location_searching
        </span>
        <h3 className="font-section-heading text-2xl text-absolute-black uppercase mb-2">
          AWAITING COORDINATES
        </h3>
        <p className="font-body-text text-secondary-brand uppercase">
          Enter a location to populate the featured grid
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (sortedVenues.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-grid-gap">
      {sortedVenues.map((venue) => (
        <VenueCard
          key={venue.id}
          venue={venue}
          distance={venue.distance_miles || 0}
          onSelect={() => onVenueSelect(venue)}
          isSelected={selectedId === venue.id}
        />
      ))}
    </div>
  );
}
