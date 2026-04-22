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
  const { lat, lon, radius, venueType } = useSearch();
  const plausible = usePlausible();

  const {
    data: venuesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType],
    queryFn: () => fetchVenues(lat!, lon!, radius, venueType || undefined),
    enabled: lat !== null && lon !== null,
  });

  const venues = venuesResponse?.all || [];

  // Track fallback results
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
      <div className="flex h-[400px] items-center justify-center bg-secondary-fixed-dim border-2 border-absolute-black">
        <div className="text-center px-6">
          <p className="font-body-bold text-body-bold text-absolute-black uppercase mb-4">
            NO LOCATION DETECTED
          </p>
          <p className="text-sm text-secondary-brand max-w-xs mx-auto uppercase">
            Search for a location to activate the interactive city grid
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center bg-secondary-fixed-dim border-2 border-absolute-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin border-4 border-renault-blue border-t-transparent" />
          <p className="font-button-label text-button-label text-absolute-black uppercase">
            CALIBRATING GRID...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center bg-secondary-fixed-dim border-2 border-absolute-black">
        <p className="font-body-bold text-error uppercase">Grid Error: System Failure</p>
      </div>
    );
  }

  return (
    <div className="h-[400px] border-2 border-absolute-black relative overflow-hidden">
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
    <div className="bg-pure-white text-absolute-black font-body-text antialiased max-w-[1440px] mx-auto pb-16 md:pb-0">
      <Header />
      
      <main>
        <Hero />
        <QuickFilters />
        
        {/* Map Section */}
        <section className="py-section-gap px-6 bg-absolute-black text-pure-white">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-section-heading text-section-heading uppercase mb-8 tracking-tighter">
              INTERACTIVE CITY GRID
            </h3>
            <VenueMapSection onVenueSelect={handleVenueSelect} />
          </div>
        </section>
        
        {/* Venue List Section */}
        <section className="py-section-gap px-6 bg-pure-white">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-section-heading text-section-heading uppercase mb-8 tracking-tighter">
              FEATURED VENUES
            </h3>
            <VenueList
              onVenueSelect={handleVenueSelect}
              selectedId={selectedVenue?.id}
            />
          </div>
        </section>
        
        {/* Branding Section */}
        <section className="py-section-gap px-6 bg-absolute-black text-pure-white text-center">
          <div className="max-w-3xl mx-auto">
            <span className="material-symbols-outlined text-6xl text-renault-yellow mb-6">
              verified
            </span>
            <h2 className="font-section-heading text-section-heading uppercase mb-6 tracking-tighter">
              CURATED. SAFE. VERIFIED.
            </h2>
            <p className="font-body-text text-body-text text-secondary-fixed-dim max-w-xl mx-auto uppercase">
              Every KidSpot venue is rigorously checked for safety, quality, and maximum fun. 
              We partner only with top-tier children&apos;s entertainment spaces to ensure 
              your celebration is perfect.
            </p>
          </div>
        </section>
      </main>

      <BottomNav />
      
      {/* Venue Detail Modal */}
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
