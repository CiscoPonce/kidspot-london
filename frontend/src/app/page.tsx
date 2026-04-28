'use client';

import { useState, useCallback } from 'react';
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

// MapLibre is heavy, only load it on the client.
const VenueMap = dynamic(
  () => import('@/components/map/venue-map').then((m) => m.VenueMap),
  { ssr: false }
);

function MapPanel({
  onVenueSelect,
}: {
  onVenueSelect: (venue: Venue) => void;
}) {
  const { lat, lon, radius, venueType, postcode } = useSearch();

  const { data: venuesResponse, isLoading } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType, postcode],
    queryFn: () =>
      fetchVenues(
        lat!,
        lon!,
        radius,
        venueType || undefined,
        postcode || undefined
      ),
    enabled: lat !== null && lon !== null,
  });

  const venues = venuesResponse?.data.all || [];

  if (lat === null || lon === null) {
    return (
      <div className="ks-card flex flex-col items-center justify-center text-center px-6 py-16 h-full min-h-[320px]">
        <div className="w-14 h-14 rounded-2xl bg-tertiary-container/70 text-on-tertiary-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[28px]">map</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-on-background">
          Map view
        </h3>
        <p className="mt-1 text-sm text-on-surface-variant max-w-xs">
          Run a search and your nearby venues will plot here.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="ks-card flex items-center justify-center h-full min-h-[320px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
      </div>
    );
  }

  return (
    <div className="ks-card overflow-hidden h-full min-h-[400px]">
      <VenueMap venues={venues} onVenueSelect={onVenueSelect} />
    </div>
  );
}

export default function HomePage() {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const handleVenueSelect = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-background pb-24 md:pb-12">
      <Header />

      <main>
        <Hero />

        <div className="mt-8 sm:mt-12">
          <QuickFilters />
        </div>

        <section
          id="results"
          className="mx-auto max-w-6xl px-4 sm:px-6 mt-6 sm:mt-8"
        >
          <div className="flex items-end justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Nearby places
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Hand-picked venues sorted by how close they are to you.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(360px,420px)]">
            <VenueList
              onVenueSelect={handleVenueSelect}
              selectedId={selectedVenue?.id}
            />
            <aside id="map" className="hidden lg:block sticky top-20 self-start h-[calc(100vh-7rem)]">
              <MapPanel onVenueSelect={handleVenueSelect} />
            </aside>
          </div>

          {/* Map for tablet / mobile rendered below the list */}
          <div className="lg:hidden mt-6 h-[420px]">
            <MapPanel onVenueSelect={handleVenueSelect} />
          </div>
        </section>

        <section
          id="trust"
          className="mx-auto max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24"
        >
          <div className="bg-surface-container rounded-3xl border border-outline-variant px-6 sm:px-12 py-12 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Curated. Safe. Verified.
            </h2>
            <p className="mt-3 text-on-surface-variant max-w-xl mx-auto">
              Every venue on KidSpot is reviewed for safety, accessibility,
              and how much fun your kids will actually have.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
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
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[22px]">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-on-background">
                    {item.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
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
        className="mx-auto max-w-6xl px-4 sm:px-6 mt-16 sm:mt-20 pt-10 pb-6 border-t border-outline-variant"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="font-display text-xl font-bold tracking-tight">
              KidSpot London
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
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
        <p className="text-xs text-outline mt-8">
          © {new Date().getFullYear()} KidSpot. All rights reserved.
        </p>
      </footer>

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
