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
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-outline-variant bg-white animate-pulse flex flex-col sm:flex-row"
          aria-hidden="true"
        >
          <div className="aspect-[16/10] sm:aspect-auto sm:w-[40%] sm:min-h-[180px] bg-surface-variant" />
          <div className="flex-1 p-5 space-y-3">
            <div className="h-5 w-20 rounded-full bg-surface-variant" />
            <div className="h-5 w-2/3 bg-surface-variant rounded" />
            <div className="h-4 w-1/3 bg-surface-variant rounded" />
            <div className="mt-4 flex justify-between gap-3">
              <div className="h-4 w-20 bg-surface-variant rounded" />
              <div className="h-9 w-20 bg-surface-variant rounded-full" />
            </div>
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
    <div className="ks-card flex flex-col items-center text-center px-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-primary-container/60 text-on-primary-container flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h3 className="font-display text-xl font-semibold text-on-background">
        {title}
      </h3>
      <p className="mt-2 text-sm text-on-surface-variant max-w-sm">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function VenueList({ onVenueSelect, selectedId }: VenueListProps) {
  const { lat, lon, radius, venueType, postcode } = useSearch();

  const { data: venuesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType, postcode],
    queryFn: () =>
      fetchVenues(lat!, lon!, radius, venueType || undefined, postcode || undefined),
    enabled: lat !== null && lon !== null,
  });

  if (lat === null || lon === null) {
    return (
      <StateCard
        icon="search"
        title="Start your search"
        message="Enter a postcode above or use your current location to find child-friendly venues nearby."
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
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
            className="bg-primary-container text-on-primary-container font-semibold rounded-full px-5 py-2 hover:brightness-95 active:scale-95 transition"
          >
            Retry
          </button>
        }
      />
    );
  }

  const venues = venuesResponse?.data.all || [];
  const sortedVenues = [...venues].sort(
    (a, b) => (a.distance_miles || 0) - (b.distance_miles || 0)
  );

  if (sortedVenues.length === 0) {
    return (
      <StateCard
        icon="explore_off"
        title="No venues nearby"
        message="Try widening your search radius or picking a different category."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-on-surface-variant">
        Showing <span className="font-semibold text-on-surface">{sortedVenues.length}</span>{' '}
        {sortedVenues.length === 1 ? 'venue' : 'venues'}
      </p>
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
