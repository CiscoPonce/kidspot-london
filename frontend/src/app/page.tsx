'use client';

import { useState, useCallback } from 'react';
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

function VenueMapSection({ onVenueSelect }: { onVenueSelect: (venue: Venue) => void }) {
  const { lat, lon, radius, venueType, postcode } = useSearch();

  const {
    data: venuesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['venues', lat, lon, radius, venueType, postcode],
    queryFn: () => fetchVenues(lat!, lon!, radius, venueType || undefined, postcode || undefined),
    enabled: lat !== null && lon !== null,
  });

  const venues = venuesResponse?.data.all || [];

  if (lat === null || lon === null) {
    return (
      <div className="flex h-64 items-center justify-center bg-secondary-800 rounded-[2.5rem] border border-border/50">
        <div className="text-center px-6">
          <button className="bg-primary text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform flex items-center gap-2 mx-auto">
            <span className="material-symbols-outlined text-sm">map</span>
            Explore Map
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-secondary-800 rounded-[2.5rem] animate-pulse border border-border/50">
        <div className="h-10 w-10 animate-spin border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center bg-red-950/20 rounded-[2.5rem] border border-red-900/30">
        <p className="text-xs font-black text-red-500 uppercase tracking-widest">Map Sync Error</p>
      </div>
    );
  }

  return (
    <div className="h-[400px] rounded-[2.5rem] overflow-hidden relative border border-border/50 shadow-2xl">
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
    <div className="bg-background text-text-main min-h-screen pb-24 max-w-[1400px] mx-auto">
      <Header />
      
      <main className="space-y-12">
        <Hero />
        <QuickFilters />
        
        {/* Featured Venues Section */}
        <section className="px-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">
              Nearby Discovery
            </h2>
            <div className="h-px flex-1 bg-border/50 mx-6" />
          </div>
          <VenueList
            onVenueSelect={handleVenueSelect}
            selectedId={selectedVenue?.id}
          />
        </section>
        
        {/* Interactive Map Section */}
        <section className="px-6">
          <div className="premium-card p-2 rounded-[3rem]">
            <VenueMapSection onVenueSelect={handleVenueSelect} />
          </div>
        </section>
        
        {/* Trust Section */}
        <section className="px-6 py-16 bg-secondary-800/30 rounded-[4rem] text-center mx-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex justify-center gap-6">
              {[
                { icon: 'verified_user', color: 'text-primary' },
                { icon: 'health_and_safety', color: 'text-green-400' },
                { icon: 'mood', color: 'text-amber-400' }
              ].map((item, i) => (
                <div key={i} className="bg-secondary-800 w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl border border-border/50">
                  <span className={`material-symbols-outlined text-3xl ${item.color}`}>{item.icon}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black tracking-tighter">Curated. Safe. Verified.</h2>
              <p className="text-text-muted font-bold leading-relaxed max-w-lg mx-auto">
                Every venue on KidSpot is rigorously checked for safety, cleanliness, and maximum fun potential.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full rounded-t-[4rem] border-t border-border/50 bg-secondary-800/50 hidden md:block mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 px-12 py-16">
          <div className="font-black text-2xl tracking-tighter">KidSpot</div>
          <div className="flex gap-8">
            {['Safety', 'Venues', 'Contact'].map(link => (
              <a key={link} className="text-text-muted hover:text-primary transition-all cursor-pointer font-black text-xs uppercase tracking-widest" href="#">{link}</a>
            ))}
          </div>
          <div className="text-text-muted font-bold text-xs uppercase tracking-widest opacity-50">
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
