'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { VenueList } from '@/components/venues/venue-list';
import { VenueDetailModal } from '@/components/modals/venue-detail-modal';
import { HeroSearchForm } from '@/components/search/hero-search-form';
import { useSearch } from '@/hooks/use-search';
import { fetchVenues, type Venue } from '@/lib/api';
import { matchesParentFilters } from '@/lib/parent-filters';
import type { MobileView } from '@/components/search/results-toolbar';

const VenueMap = dynamic(
  () => import('@/components/map/venue-map').then((m) => m.VenueMap),
  { ssr: false }
);

function MapPanel({
  onVenueSelect,
}: {
  onVenueSelect: (venue: Venue) => void;
}) {
  const { lat, lon, radius, venueType, facets, postcode, kidsCount, catering } = useSearch();

  const { data: venuesResponse, isLoading } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType, facets, postcode],
    queryFn: () =>
      fetchVenues(
        lat!,
        lon!,
        radius,
        venueType || undefined,
        postcode || undefined,
        50,
        facets
      ),
    enabled: lat !== null && lon !== null,
    placeholderData: keepPreviousData,
  });

  const venues = (venuesResponse?.data.all || []).filter((venue) =>
    matchesParentFilters(venue, kidsCount, catering)
  );

  if (lat === null || lon === null) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-brand-border bg-white p-8 text-center">
        <h3 className="text-base font-semibold text-brand-dark">Map</h3>
        <p className="mt-2 max-w-xs text-sm text-brand-muted">
          Search a postcode to plot venues nearby.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-brand-border bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-dark" />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-xl border border-brand-border bg-white">
      <VenueMap venues={venues} onVenueSelect={onVenueSelect} />
      {venues.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <span className="inline-flex items-center rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-brand-dark">
            {venues.length} on map
          </span>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const router = useRouter();
  const { postcode } = useSearch();

  const handleVenueSelect = useCallback((venue: Venue) => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/venue/${venue.slug}`);
      return;
    }
    setSelectedVenue(venue);
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-paper pb-24 text-brand-dark md:pb-12">
      <section className="border-b border-brand-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-lg">
              <h1 className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">
                Find a party venue nearby
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                {postcode && postcode !== 'London'
                  ? `Near ${postcode} · save a shortlist, then call`
                  : 'Postcode, how many kids, then call the venue'}
              </p>
            </div>
            <div className="w-full max-w-xl lg:max-w-2xl">
              <HeroSearchForm />
            </div>
          </div>
        </div>
      </section>

      <section id="results" className="mx-auto max-w-7xl px-4 py-5 sm:px-8">

        <div className="grid gap-6 lg:grid-cols-12">
          <div className={`lg:col-span-7 ${mobileView === 'map' ? 'hidden lg:block' : ''}`}>
            <VenueList
              onVenueSelect={handleVenueSelect}
              selectedId={selectedVenue?.id}
              mobileView={mobileView}
              onMobileViewChange={setMobileView}
            />
          </div>

          <aside
            id="map"
            className={`lg:col-span-5 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:self-start ${
              mobileView === 'list' ? 'hidden lg:block' : ''
            }`}
          >
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="text-sm font-medium text-brand-dark underline underline-offset-2"
              >
                Back to list
              </button>
            </div>
            <div className="h-[70vh] lg:h-full">
              <MapPanel onVenueSelect={handleVenueSelect} />
            </div>
          </aside>
        </div>
      </section>

      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          isOpen={!!selectedVenue}
          onClose={() => setSelectedVenue(null)}
        />
      )}
    </div>
  );
}
