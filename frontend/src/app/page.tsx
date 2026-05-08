'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Hero } from '@/components/layout/hero';
import { QuickFilters } from '@/components/layout/quick-filters';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VenueList } from '@/components/venues/venue-list';
import { VenueDetailModal } from '@/components/modals/venue-detail-modal';
import { useSearch } from '@/hooks/use-search';
import { fetchVenues, type Venue } from '@/lib/api';

const VenueMap = dynamic(
  () => import('@/components/map/venue-map').then((m) => m.VenueMap),
  { ssr: false }
);

function MapPanel({
  onVenueSelect,
}: {
  onVenueSelect: (venue: Venue) => void;
}) {
  const { lat, lon, radius, venueType, facets, postcode } = useSearch();

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
  });

  const venues = venuesResponse?.data.all || [];

  if (lat === null || lon === null) {
    return (
      <div className="ks-card flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-tertiary-container/70 text-on-tertiary-container">
          <span className="material-symbols-outlined text-[28px]">map</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-on-background">
          Map view
        </h3>
        <p className="mt-1 max-w-xs text-sm text-on-surface-variant">
          Run a search and your nearby venues will plot here.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="ks-card flex h-full min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-3xl border border-outline-variant bg-white">
      <VenueMap venues={venues} onVenueSelect={onVenueSelect} />
      {venues.length > 0 && (
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-on-surface shadow-sm backdrop-blur-sm">
            <span className="material-symbols-outlined text-[16px] text-[#006972]">
              location_on
            </span>
            Showing {venues.length} {venues.length === 1 ? 'venue' : 'venues'} nearby
          </span>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const mobileMapRef = useRef<HTMLDivElement | null>(null);

  const handleVenueSelect = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  const handleViewMap = useCallback(() => {
    mobileMapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-background pb-32 md:pb-12">
      <Header />

      <main>
        <Hero />

        <div className="mt-8 sm:mt-12">
          <QuickFilters />
        </div>

        <section
          id="results"
          className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 sm:mt-8"
        >
          <div className="mb-4 flex items-end justify-between sm:mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Nearby places
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Hand-picked venues sorted by how close they are to you.
              </p>
            </div>
          </div>

          {/* Desktop: map LEFT, results RIGHT (50/50 split, both sticky/scrollable) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <aside
              id="map"
              className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-7rem)]"
            >
              <MapPanel onVenueSelect={handleVenueSelect} />
            </aside>
            <div className="lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
              <VenueList
                onVenueSelect={handleVenueSelect}
                selectedId={selectedVenue?.id}
              />
            </div>
          </div>

          {/* Mobile / tablet map below the list */}
          <div
            ref={mobileMapRef}
            id="map-mobile"
            className="lg:hidden mt-6 h-[420px] scroll-mt-24"
          >
            <MapPanel onVenueSelect={handleVenueSelect} />
          </div>
        </section>

        <section
          id="trust"
          className="mx-auto mt-16 max-w-6xl px-4 sm:mt-24 sm:px-6"
        >
          <div className="rounded-3xl border border-outline-variant bg-surface-container px-6 py-12 text-center sm:px-12">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Curated. Safe. Verified.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">
              Every venue on KidSpot is reviewed for safety, accessibility,
              and how much fun your kids will actually have.
            </p>
            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  icon: 'verified_user',
                  title: 'Safety-checked',
                  body: 'We confirm child-friendly status, accessibility, and basic safety information for every listing.',
                },
                {
                  icon: 'health_and_safety',
                  title: 'Vetted sources',
                  body: 'Data is cross-checked against trusted sources like Google, Yelp, and OpenStreetMap.',
                },
                {
                  icon: 'mood',
                  title: 'Fun-first',
                  body: 'We surface the venues parents and kids actually love — not just the closest results.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-left"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                    <span className="material-symbols-outlined text-[22px]">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-on-background">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        id="footer"
        className="mx-auto mt-16 max-w-6xl border-t border-outline-variant px-4 pb-6 pt-10 sm:mt-20 sm:px-6"
      >
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="font-display text-xl font-bold tracking-tight">
              KidSpot London
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              Built for happy families.
            </p>
          </div>
          <nav className="flex gap-5 text-sm font-medium text-on-surface-variant">
            <a href="#trust" className="hover:text-tertiary transition-colors">
              How it works
            </a>
            <a href="/" className="hover:text-tertiary transition-colors">
              Browse
            </a>
            <a
              href="https://tally.so/r/n0XOXO"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-tertiary transition-colors"
            >
              Feedback
            </a>
          </nav>
        </div>
        <p className="mt-8 text-xs text-outline">
          © {new Date().getFullYear()} KidSpot. All rights reserved.
        </p>
      </footer>

      {/* Mobile floating "View Map" pill (above the bottom nav) */}
      <button
        type="button"
        onClick={handleViewMap}
        aria-label="View venues on the map"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1d1c10] px-5 py-3 text-sm font-semibold text-[#fff9e6] shadow-[0_8px_24px_rgba(29,28,16,0.25)] hover:brightness-110 active:scale-95 transition lg:hidden"
      >
        <span className="material-symbols-outlined text-[18px]">map</span>
        View Map
      </button>

      <BottomNav />

      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          isOpen={true}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
