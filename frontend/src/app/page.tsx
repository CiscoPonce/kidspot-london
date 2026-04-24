'use client';

import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Hero } from '@/components/layout/hero';
import { QuickFilters } from '@/components/layout/quick-filters';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VenueList } from '@/components/venues/venue-list';
import { VenueMap } from '@/components/map/venue-map';
import { VenueDetailModal } from '@/components/modals/venue-detail-modal';
import { useSearch } from '@/hooks/use-search';
import { fetchVenues, type Venue } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { usePlausible } from 'next-plausible';

function VenueMapSection({ onVenueSelect }: { onVenueSelect: (venue: Venue) => void }) {
  const { lat, lon, radius, venueType, postcode } = useSearch();
  const plausible = usePlausible();

  const {
    data: venuesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType, postcode],
    queryFn: () => fetchVenues(lat!, lon!, radius, venueType || undefined, postcode || undefined),
    enabled: lat !== null && lon !== null,
  });

  const venues = venuesResponse?.all || [];

  useEffect(() => {
    if (venuesResponse?.meta?.fallback_triggered) {
      plausible('FallbackTriggered', { 
        props: { 
          source: venuesResponse.meta.fallback_source,
          count: venuesResponse.meta.fallback_count 
        } 
      });
    }
  }, [venuesResponse, plausible]);

  if (lat === null || lon === null) {
    return (
      <div className="flex h-64 items-center justify-center bg-surface-variant rounded-[12px] opacity-80">
        <div className="text-center px-6">
          <button className="bg-primary-container text-on-primary-container px-6 py-3 rounded-full font-title-sm text-title-sm shadow-md active:scale-95 transition-transform flex items-center gap-2 mx-auto">
            <span className="material-symbols-outlined">map</span>
            View Map
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-surface-variant rounded-[12px] animate-pulse">
        <div className="h-10 w-10 animate-spin border-4 border-primary-container border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center bg-error-container rounded-[12px]">
        <p className="font-title-sm text-error uppercase">Grid Connection Error</p>
      </div>
    );
  }

  return (
    <div className="h-64 rounded-[12px] overflow-hidden relative">
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
    <div className="bg-background text-on-background min-h-screen pb-24 max-w-[container-max] mx-auto">
      <Header />
      
      <main>
        <Hero />
        <QuickFilters />
        
        {/* Featured Venues Section */}
        <section className="px-margin-mobile py-stack-md space-y-stack-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Featured Spaces
          </h2>
          <VenueList
            onVenueSelect={handleVenueSelect}
            selectedId={selectedVenue?.id}
          />
        </section>
        
        {/* Interactive Map Section */}
        <section className="px-margin-mobile py-stack-md">
          <div className="bg-surface-container-lowest rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-2">
            <VenueMapSection onVenueSelect={handleVenueSelect} />
          </div>
        </section>
        
        {/* Trust Section */}
        <section className="px-margin-mobile py-stack-lg bg-surface-container-low text-center rounded-t-[32px] mt-8">
          <div className="max-w-md mx-auto space-y-6">
            <div className="flex justify-center gap-4">
              <div className="bg-surface-container-lowest p-4 rounded-full shadow-sm text-tertiary">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-full shadow-sm text-tertiary">
                <span className="material-symbols-outlined text-3xl">health_and_safety</span>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-full shadow-sm text-tertiary">
                <span className="material-symbols-outlined text-3xl">mood</span>
              </div>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Curated. Safe. Verified.</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Every venue on KidSpot is rigorously checked for safety, cleanliness, and maximum fun potential.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-zinc-50 dark:bg-zinc-950 w-full rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800 hidden md:block mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 px-8 py-12">
          <div className="font-bold text-lg text-zinc-900 dark:text-zinc-50">KidSpot</div>
          <div className="flex gap-6">
            <a className="text-zinc-500 dark:text-zinc-400 hover:text-primary transition-colors cursor-pointer font-space-grotesk text-sm" href="#">Safety</a>
            <a className="text-zinc-500 dark:text-zinc-400 hover:text-primary transition-colors cursor-pointer font-space-grotesk text-sm" href="#">Venues</a>
            <a className="text-zinc-500 dark:text-zinc-400 hover:text-primary transition-colors cursor-pointer font-space-grotesk text-sm" href="#">Contact</a>
          </div>
          <div className="text-zinc-500 dark:text-zinc-400 font-space-grotesk text-sm">
            © 2026 KidSpot. Built for happy families.
          </div>
        </div>
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
