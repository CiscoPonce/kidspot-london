'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchVenues, type Venue } from '@/lib/api';
import { useSearch } from '@/hooks/use-search';
import { ResultsToolbar } from '@/components/search/results-toolbar';
import { sortVenues, type SortMode } from '@/lib/venue-sort';
import { VenueCard } from './venue-card';

interface VenueListProps {
  onVenueSelect: (venue: Venue) => void;
  selectedId?: string | number;
  onSearchComplete?: () => void;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-3xl border border-[#EBE5D3] bg-white"
          aria-hidden="true"
        >
          <div className="aspect-[16/10] bg-[#F5F2E3]" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 rounded bg-[#F5F2E3]" />
            <div className="h-4 w-1/3 rounded bg-[#F5F2E3]" />
            <div className="h-9 w-full rounded-full bg-[#F5F2E3]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StateCard({
  icon,
  title,
  message,
  action,
}: {
  icon: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-[#EBE5D3] bg-white px-6 py-12 text-center shadow-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-yellow/30 text-brand-dark">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h3 className="font-display text-xl font-bold text-brand-dark">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-[#5E5E5E]">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function VenueList({ onVenueSelect, selectedId, onSearchComplete }: VenueListProps) {
  const { lat, lon, radius, venueType, facets, postcode } = useSearch();
  const [sort, setSort] = useState<SortMode>('recommended');

  const { data: venuesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType, facets, postcode],
    queryFn: () =>
      fetchVenues(lat!, lon!, radius, venueType || undefined, postcode || undefined, 50, facets),
    enabled: lat !== null && lon !== null,
    placeholderData: keepPreviousData,
  });

  if (lat === null || lon === null) {
    return (
      <StateCard
        icon="search"
        title="Start your search"
        message="Enter your postcode or area above, or tap the location button to find birthday party venues near you."
      />
    );
  }

  if (isLoading) {
    return (
      <>
        <ResultsToolbar sort={sort} onSortChange={setSort} onSearchComplete={onSearchComplete} />
        <LoadingSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <StateCard
        icon="error"
        title="Something went wrong"
        message="We couldn't load venues just now. Please try again."
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-dark transition hover:bg-brand-yellow-hover active:scale-95"
          >
            Retry
          </button>
        }
      />
    );
  }

  const venues = venuesResponse?.data.all || [];
  const sortedVenues = sortVenues(venues, sort);

  if (sortedVenues.length === 0) {
    return (
      <>
      <ResultsToolbar sort={sort} onSortChange={setSort} resultCount={0} onSearchComplete={onSearchComplete} />
        <StateCard
          icon="explore_off"
          title="No venues in this area"
          message="Try widening the distance to 10 miles, or switch to All venues to see community halls and outdoor spaces."
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ResultsToolbar sort={sort} onSortChange={setSort} resultCount={sortedVenues.length} onSearchComplete={onSearchComplete} />

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
