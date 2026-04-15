'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { VenueList } from '@/components/venues/venue-list';
import type { Venue } from '@/lib/api';

export default function HomePage() {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  return (
    <main className="min-h-screen bg-secondary-50">
      {/* Mobile breakpoint indicator - hidden in production */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-secondary-800 px-3 py-2 text-sm text-white sm:hidden">
        <span className="font-medium">375px</span>
        <span className="text-secondary-300">Mobile</span>
      </div>

      {/* Desktop breakpoint indicator - hidden in production */}
      <div className="fixed bottom-4 left-4 z-50 hidden items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white lg:flex">
        <span className="font-medium">1280px</span>
        <span className="text-primary-200">Desktop</span>
      </div>

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8">
        <SearchBar />
      </div>

      {/* Venue List Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">
          Nearby Venues
        </h2>
        <VenueList
          onVenueSelect={setSelectedVenue}
          selectedId={selectedVenue?.id}
        />
      </div>
    </main>
  );
}