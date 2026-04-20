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
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[72px] rounded-lg bg-secondary-100 animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-secondary-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-secondary-900 mb-1">
        No venues found
      </h3>
      <p className="text-sm text-secondary-500">
        Try expanding your search radius or searching a different area
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-secondary-900 mb-1">
        Something went wrong
      </h3>
      <p className="text-sm text-secondary-500 mb-4">
        Unable to load venues. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 active:scale-[0.98] transition-all"
      >
        Try Again
      </button>
    </div>
  );
}

export function VenueList({ onVenueSelect, selectedId }: VenueListProps) {
  const { lat, lon, radius } = useSearch();

  const { data: venuesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['venues', lat, lon, radius],
    queryFn: () => fetchVenues(lat!, lon!, radius),
    enabled: lat !== null && lon !== null,
  });

  const venues = venuesResponse?.all || [];

  // Sort venues by distance (nearest first)
  const sortedVenues = venues.length > 0
    ? [...venues].sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
    : [];

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!lat || !lon) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-secondary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mb-1">
          Search for venues
        </h3>
        <p className="text-sm text-secondary-500">
          Enter a postcode or use your location to find venues nearby
        </p>
      </div>
    );
  }

  if (sortedVenues.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="w-full space-y-3 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
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