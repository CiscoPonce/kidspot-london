'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVenues, type Venue } from '@/lib/api';
import { useSearch } from '@/hooks/use-search';
import { VenueCard } from './venue-card';

interface VenueListProps {
  onVenueSelect: (venue: Venue) => void;
  selectedId?: string | number;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-32 rounded-[2rem] bg-secondary-800 animate-pulse border border-border/50"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center premium-card rounded-[2.5rem]">
      <div className="w-20 h-20 rounded-full bg-secondary-800 flex items-center justify-center mb-6 border border-border">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-black text-text-main mb-2 tracking-tight">
        No Venues Found
      </h3>
      <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
        Try expanding your discovery radius
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center premium-card rounded-[2.5rem]">
      <div className="w-20 h-20 rounded-full bg-red-950 flex items-center justify-center mb-6 border border-red-900/50">
        <svg
          className="w-10 h-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-black text-text-main mb-2 tracking-tight">
        System Error
      </h3>
      <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-6">
        Discovery engine encountered a fault
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-6 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/20"
      >
        Reboot Search
      </button>
    </div>
  );
}

export function VenueList({ onVenueSelect, selectedId }: VenueListProps) {
  const { lat, lon, radius, venueType, postcode } = useSearch();

  const { data: venuesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType, postcode],
    queryFn: () => fetchVenues(lat!, lon!, radius, venueType || undefined, postcode || undefined),
    enabled: lat !== null && lon !== null,
  });

  const venues = venuesResponse?.data.all || [];
  const sortedVenues = [...venues].sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!lat || !lon) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center premium-card rounded-[2.5rem]">
        <div className="w-20 h-20 rounded-full bg-secondary-800 flex items-center justify-center mb-6 border border-border">
          <svg
            className="w-10 h-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-black text-text-main mb-2 tracking-tight">
          Initialize Discovery
        </h3>
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Enter a location to map nearby venues
        </p>
      </div>
    );
  }

  if (sortedVenues.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full space-y-4 pr-2 -mr-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
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
