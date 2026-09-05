'use client';

import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchVenues, type Venue } from '@/lib/api';
import { useSearch } from '@/hooks/use-search';
import { ResultsToolbar, type MobileView } from '@/components/search/results-toolbar';
import { sortVenues, type SortMode } from '@/lib/venue-sort';
import { matchesParentFilters } from '@/lib/parent-filters';
import { VenueCard } from './venue-card';

interface VenueListProps {
  onVenueSelect: (venue: Venue) => void;
  selectedId?: string | number;
  mobileView?: MobileView;
  onMobileViewChange?: (view: MobileView) => void;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-brand-border bg-white"
          aria-hidden="true"
        >
          <div className="aspect-[16/10] animate-pulse bg-brand-cream-dark" />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-1/3 rounded bg-brand-cream-dark" />
            <div className="h-5 w-2/3 rounded bg-brand-cream-dark" />
            <div className="h-4 w-1/2 rounded bg-brand-cream-dark" />
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
    <div className="flex flex-col items-center rounded-xl border border-brand-border bg-white px-6 py-12 text-center">
      <span className="material-symbols-outlined mb-3 text-[28px] text-brand-muted">{icon}</span>
      <h3 className="text-lg font-semibold text-brand-dark">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-brand-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function VenueList({
  onVenueSelect,
  selectedId,
  mobileView,
  onMobileViewChange,
}: VenueListProps) {
  const { lat, lon, radius, venueType, facets, postcode, kidsCount, catering } = useSearch();
  const [sort, setSort] = useState<SortMode>('recommended');
  const [visible, setVisible] = useState(12);

  useEffect(() => {
    setVisible(12);
  }, [lat, lon, radius, venueType, facets, postcode, kidsCount, catering, sort]);

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
        title="Enter a postcode"
        message="Search by London postcode or area to see party venues nearby."
      />
    );
  }

  if (isLoading) {
    return (
      <>
        <ResultsToolbar
          sort={sort}
          onSortChange={setSort}
          mobileView={mobileView}
          onMobileViewChange={onMobileViewChange}
        />
        <LoadingSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <StateCard
        icon="error"
        title="Could not load venues"
        message="Please try again."
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-yellow-hover"
          >
            Retry
          </button>
        }
      />
    );
  }

  const venues = venuesResponse?.data.all || [];
  const filteredVenues = venues.filter((venue) =>
    matchesParentFilters(venue, kidsCount, catering)
  );
  const sortedVenues = sortVenues(filteredVenues, sort);

  if (sortedVenues.length === 0) {
    return (
      <>
        <ResultsToolbar
          sort={sort}
          onSortChange={setSort}
          resultCount={0}
          mobileView={mobileView}
          onMobileViewChange={onMobileViewChange}
        />
        <StateCard
          icon="explore_off"
          title="No venues in this area"
          message="Try 10 miles, or switch to All venues."
        />
      </>
    );
  }

  const shown = sortedVenues.slice(0, visible);

  return (
    <div className="flex flex-col gap-4">
      <ResultsToolbar
        sort={sort}
        onSortChange={setSort}
        resultCount={sortedVenues.length}
        mobileView={mobileView}
        onMobileViewChange={onMobileViewChange}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((venue, index) => (
          <div key={String(venue.id)} className={index === 0 ? 'sm:col-span-2' : undefined}>
            <VenueCard
              venue={venue}
              distance={venue.distance_miles || 0}
              onSelect={() => onVenueSelect(venue)}
              isSelected={selectedId === venue.id}
              featured={index === 0}
            />
          </div>
        ))}
      </div>

      {visible < sortedVenues.length && (
        <button
          type="button"
          onClick={() => setVisible((n) => n + 12)}
          className="rounded-xl border border-brand-border bg-white py-3 text-sm font-semibold text-brand-dark hover:border-brand-dark/40"
        >
          Show more ({sortedVenues.length - visible} left)
        </button>
      )}
    </div>
  );
}
