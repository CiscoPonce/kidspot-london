'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { VenueList } from '@/components/venues/venue-list';
import { VenueDetailModal } from '@/components/modals/venue-detail-modal';
import { HeroSearchForm } from '@/components/search/hero-search-form';
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
    placeholderData: keepPreviousData,
  });

  const venues = venuesResponse?.data.all || [];

  if (lat === null || lon === null) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-3xl border border-[#EBE5D3] bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow/30 text-brand-dark">
          <span className="material-symbols-outlined text-[30px]">map</span>
        </div>
        <h3 className="font-display text-xl font-bold text-brand-dark">
          Map View
        </h3>
        <p className="mt-2 max-w-xs text-sm text-[#5E5E5E]">
          Enter your location above to plot safety-checked venues nearby.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-[#EBE5D3] bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EBE5D3] border-t-brand-yellow" />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-3xl border border-[#EBE5D3] bg-white shadow-sm">
      <VenueMap venues={venues} onVenueSelect={onVenueSelect} />
      {venues.length > 0 && (
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-brand-dark shadow-md backdrop-blur-sm">
            <span className="material-symbols-outlined text-[16px] text-brand-dark">
              location_on
            </span>
            Showing {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const heroAnchorRef = useRef<HTMLDivElement | null>(null);
  const mobileMapRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { postcode, setVenueType } = useSearch();

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleCategorySelect = useCallback((type: string | null) => {
    setVenueType(type);
    scrollToResults();
  }, [setVenueType, scrollToResults]);

  const handleVenueSelect = useCallback((venue: Venue) => {
    // Full detail page on tablet/desktop — modal is mobile-only
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/venue/${venue.slug}`);
      return;
    }
    setSelectedVenue(venue);
  }, [router]);

  const handleModalClose = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  useEffect(() => {
    const target = heroAnchorRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickySearch(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-brand-dark pb-24 md:pb-12">
      {showStickySearch && (
        <div className="sticky top-[57px] z-30 border-b border-[#EBE5D3] bg-[#FFFDF5]/95 px-4 py-3 shadow-sm backdrop-blur-md sm:px-8">
          <div className="mx-auto max-w-7xl">
            <HeroSearchForm variant="compact" onSearchComplete={scrollToResults} />
          </div>
        </div>
      )}
      {/* Mobile Floating Hero Header Overlay */}
      <div className="md:hidden relative w-full h-[380px] bg-brand-dark overflow-hidden">
        <img
          src="/hero-party.jpg"
          alt="Kids birthday party hero"
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
        
        {/* Floating Logo Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="w-12 h-12 rounded-full bg-brand-yellow flex items-center justify-center shadow-lg font-bold text-brand-dark text-base">
            KS
          </div>
        </div>

        <div className="absolute bottom-6 left-4 right-4 z-10 text-center">
          <h1 className="font-display text-2xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
            Find the Perfect Birthday Party Venue
          </h1>

          <HeroSearchForm variant="mobile" onSearchComplete={scrollToResults} />
        </div>
      </div>

      {/* Desktop Hero Section */}
      <section className="hidden md:block mx-auto max-w-7xl px-8 pt-8 pb-12">
        <div className="grid grid-cols-12 gap-12 items-center">
          <div className="col-span-7">
            <h1 className="font-display text-5xl font-extrabold text-brand-dark tracking-tight leading-[1.15]">
              Find the Perfect Kids&apos; Birthday Party Venue
            </h1>
            <p className="mt-4 text-base text-[#5E5E5E] max-w-lg leading-relaxed font-normal">
              Find soft play, trampolines, activity centres, party rooms and family restaurants for your child&apos;s birthday — searchable by London postcode.
            </p>

            <HeroSearchForm variant="desktop" onSearchComplete={scrollToResults} />
          </div>

          <div className="col-span-5">
            <div className="relative h-[380px] w-full rounded-3xl overflow-hidden shadow-xl border-4 border-white">
              <img
                src="/hero-party.jpg"
                alt="Kids celebrating birthday party"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Category Quick Cards */}
      <section className="md:hidden px-4 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleCategorySelect('softplay')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F5F2E3] border border-[#E8E2CD] text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#E5DFCA] flex items-center justify-center mb-2 text-brand-dark">
              <span className="material-symbols-outlined text-[20px]">castle</span>
            </div>
            <span className="text-[11px] font-bold text-brand-dark leading-tight">
              Soft Play Parties
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategorySelect('community_hall')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FDF0EE] border border-[#F9E0DC] text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#F5D7D3] flex items-center justify-center mb-2 text-brand-dark">
              <span className="material-symbols-outlined text-[20px]">celebration</span>
            </div>
            <span className="text-[11px] font-bold text-brand-dark leading-tight">
              Party Room Hire
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategorySelect('softplay')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#EDEAF7] border border-[#DDD7EF] text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#D7CFEE] flex items-center justify-center mb-2 text-brand-dark">
              <span className="material-symbols-outlined text-[20px]">sports_gymnastics</span>
            </div>
            <span className="text-[11px] font-bold text-brand-dark leading-tight">
              Trampoline & Activity
            </span>
          </button>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="w-full bg-[#F7F2E2] border-y border-[#EBE5D3] py-6 mt-8 md:mt-12 px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-[#7B785F]">
          Built for London parents planning birthday parties
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 mt-4 text-xs font-semibold text-[#5E5E5E]">
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-green-700">verified_user</span>
            Party-focused venues only
          </span>
          <span className="hidden sm:inline text-[#CCC7AB]">|</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-brand-dark">location_on</span>
            Search by postcode
          </span>
          <span className="hidden sm:inline text-[#CCC7AB]">|</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-brand-dark">call</span>
            Enquire directly with venues
          </span>
        </div>
      </section>

      <div ref={heroAnchorRef} aria-hidden="true" className="h-px w-full" />

      {/* Results */}
      <section id="results" className="mx-auto max-w-7xl px-4 sm:px-8 mt-10 md:mt-16">
        <div className="mb-2">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-brand-dark">
            Birthday Party Venues Near You
          </h2>
          <p className="text-xs md:text-sm text-[#5E5E5E] mt-1">
            {postcode && postcode !== 'London'
              ? `Soft play, trampolines, party rooms and more near ${postcode}.`
              : 'Search by postcode to see soft play, trampolines, party rooms and more.'}
          </p>
        </div>

        {/* Split Grid: Results List + Interactive Map */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <VenueList
              onVenueSelect={handleVenueSelect}
              selectedId={selectedVenue?.id}
              onSearchComplete={scrollToResults}
            />
          </div>

          <aside
            id="map"
            className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-8rem)]"
          >
            <div ref={mobileMapRef} className="h-[380px] lg:h-full">
              <MapPanel onVenueSelect={handleVenueSelect} />
            </div>
          </aside>
        </div>
      </section>

      {/* Feature Highlights (3 Cards) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-8 mt-16 md:mt-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Safety First */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-full bg-[#ECE600] flex items-center justify-center mb-6 text-brand-dark">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
              Party-Focused Listings
            </h3>
            <p className="text-sm text-[#5E5E5E] leading-relaxed">
              Soft play, trampolines, activity centres, party rooms, and family restaurants — curated for birthday parties.
            </p>
          </div>

          {/* Card 2: Instant Booking */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-full bg-[#E8D9FF] flex items-center justify-center mb-6 text-[#6B21A8]">
              <span className="material-symbols-outlined text-[24px]">bolt</span>
            </div>
            <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
              Enquire Directly
            </h3>
            <p className="text-sm text-[#5E5E5E] leading-relaxed">
              Pick your date, then contact the venue to check availability, packages, and pricing.
            </p>
          </div>

          {/* Card 3: Party Experts */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-full bg-[#FFD6E8] flex items-center justify-center mb-6 text-[#9F1239]">
              <span className="material-symbols-outlined text-[24px]">celebration</span>
            </div>
            <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
              Birthday Party Experts
            </h3>
            <p className="text-sm text-[#5E5E5E] leading-relaxed">
              From soft play to trampolines, our curated catalogue is 100% focused on kids&apos; birthday parties.
            </p>
          </div>
        </div>
      </section>

      {/* Call-to-Action Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-8 mt-16 md:mt-24">
        <div className="bg-brand-yellow rounded-3xl p-8 md:p-16 text-center shadow-xl border border-brand-yellow">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-brand-dark tracking-tight">
            Ready to plan the perfect birthday party?
          </h2>
          <p className="mt-4 text-sm md:text-base text-brand-dark/80 max-w-xl mx-auto font-medium">
            Compare venues near you, save favourites, and enquire when you&apos;re ready.
          </p>
          <div className="mt-8">
            <Link
              href="/#results"
              className="inline-flex items-center gap-2 bg-brand-olive text-white text-base font-bold px-8 py-4 rounded-full hover:bg-black active:scale-95 transition-all shadow-md"
            >
              Start Your Search
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Venue Detail Modal */}
      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          isOpen={!!selectedVenue}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
