'use client';

import { useState, useCallback, useEffect } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { VenueList } from '@/components/venues/venue-list';
import { VenueMap } from '@/components/map/venue-map';
import { VenueDetailModal } from '@/components/modals/venue-detail-modal';
import { useSearch } from '@/hooks/use-search';
import { fetchVenues, type Venue } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { usePlausible } from 'next-plausible';

interface VenueMapSectionProps {
  onVenueSelect: (venue: Venue) => void;
}

function VenueMapSection({ onVenueSelect }: VenueMapSectionProps) {
  const { lat, lon, radius } = useSearch();
  const plausible = usePlausible();

  const {
    data: venuesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['venues', lat, lon, radius],
    queryFn: () => fetchVenues(lat!, lon!, radius),
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
      <div className="flex h-64 items-center justify-center bg-secondary-100">
        <p className="text-secondary-600">
          Search for a location to see venues on the map
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-secondary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-secondary-600">Finding venues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center bg-secondary-100">
        <p className="text-red-600">Error loading venues</p>
      </div>
    );
  }

  return <VenueMap venues={venues} onVenueSelect={onVenueSelect} />;
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
    <main className="min-h-screen bg-secondary-50">
      {/* Breakpoint indicators - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-secondary-800 px-3 py-2 text-sm text-white sm:hidden">
            <span className="font-medium">375px</span>
            <span className="text-secondary-300">Mobile</span>
          </div>

          <div className="fixed bottom-4 left-4 z-50 hidden items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white lg:flex">
            <span className="font-medium">1280px</span>
            <span className="text-primary-200">Desktop</span>
          </div>
        </>
      )}

      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-secondary-900 sm:text-4xl">
          KidSpot London
        </h1>
        <p className="mt-2 text-base text-secondary-600">
          Find child-friendly venues near you
        </p>
      </div>

      {/* Search Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
        <SearchBar />
      </div>

      {/* Map Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">
          Map View
        </h2>
        <div className="overflow-hidden rounded-lg shadow-md">
          <VenueMapSection onVenueSelect={handleVenueSelect} />
        </div>
      </div>

      {/* Venue List Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">
          Nearby Venues
        </h2>
        <VenueList
          onVenueSelect={handleVenueSelect}
          selectedId={selectedVenue?.id}
        />
      </div>

      {/* Venue Detail Modal */}
      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          isOpen={true}
          onClose={handleModalClose}
        />
      )}
    </main>
  );
}
