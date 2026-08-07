'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
  const [locationQuery, setLocationQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const mobileMapRef = useRef<HTMLDivElement | null>(null);
  const { setPostcode, setSearchLocation } = useSearch();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationQuery.trim()) {
      setPostcode(locationQuery.trim());
      // Default to London coordinates if search is triggered
      setSearchLocation(51.5074, -0.1278);
    }
  };

  const handleVenueSelect = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-brand-dark pb-24 md:pb-12">
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

          <form onSubmit={handleSearchSubmit} className="mt-4 relative">
            <div className="flex items-center bg-white rounded-full p-1.5 shadow-xl border border-white/20">
              <span className="material-symbols-outlined text-[#8E8B7B] ml-3 text-[20px]">
                location_on
              </span>
              <input
                type="text"
                placeholder="Enter location..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-sm text-brand-dark placeholder-[#8E8B7B] outline-none font-medium"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-full bg-brand-yellow text-brand-dark flex items-center justify-center shrink-0 hover:brightness-95 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">
                  search
                </span>
              </button>
            </div>
          </form>
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
              London&apos;s #1 directory of safety-checked venues for children&apos;s birthday parties. Soft play, trampolines, adventure centres &amp; more.
            </p>

            {/* Desktop Search Bar */}
            <form onSubmit={handleSearchSubmit} className="mt-8">
              <div className="inline-flex items-center bg-white rounded-full p-2 shadow-lg border border-[#EBE5D3] gap-2">
                <div className="flex items-center gap-2 px-4 border-r border-[#EBE5D3]">
                  <span className="material-symbols-outlined text-[#8E8B7B] text-[20px]">
                    location_on
                  </span>
                  <input
                    type="text"
                    placeholder="Location"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="w-36 bg-transparent py-2 text-sm font-medium text-brand-dark placeholder-[#8E8B7B] outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 px-4">
                  <span className="material-symbols-outlined text-[#8E8B7B] text-[20px]">
                    calendar_today
                  </span>
                  <input
                    type="text"
                    placeholder="mm/dd/yyyy"
                    value={dateQuery}
                    onChange={(e) => setDateQuery(e.target.value)}
                    className="w-36 bg-transparent py-2 text-sm font-medium text-brand-dark placeholder-[#8E8B7B] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-brand-yellow text-brand-dark text-sm font-bold px-8 py-3 rounded-full hover:bg-brand-yellow-hover active:scale-95 transition-all shadow-sm"
                >
                  Search
                </button>
              </div>
            </form>
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
          <Link
            href="/#results"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F5F2E3] border border-[#E8E2CD] text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#E5DFCA] flex items-center justify-center mb-2 text-brand-dark">
              <span className="material-symbols-outlined text-[20px]">castle</span>
            </div>
            <span className="text-[11px] font-bold text-brand-dark leading-tight">
              Soft Play Parties
            </span>
          </Link>

          <Link
            href="/#results"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FDF0EE] border border-[#F9E0DC] text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#F5D7D3] flex items-center justify-center mb-2 text-brand-dark">
              <span className="material-symbols-outlined text-[20px]">celebration</span>
            </div>
            <span className="text-[11px] font-bold text-brand-dark leading-tight">
              Themed Party Rooms
            </span>
          </Link>

          <Link
            href="/#results"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#EDEAF7] border border-[#DDD7EF] text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#D7CFEE] flex items-center justify-center mb-2 text-brand-dark">
              <span className="material-symbols-outlined text-[20px]">sports_gymnastics</span>
            </div>
            <span className="text-[11px] font-bold text-brand-dark leading-tight">
              Adventure & Trampoline
            </span>
          </Link>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="w-full bg-[#F7F2E2] border-y border-[#EBE5D3] py-6 mt-8 md:mt-12 px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-[#7B785F]">
          Trusted by 50,000+ parents & partners
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 mt-4 text-sm font-bold text-brand-dark">
          <span>PartyTots</span>
          <span className="hidden sm:inline text-[#CCC7AB]">|</span>
          <span>SafePlay UK</span>
          <span className="hidden sm:inline text-[#CCC7AB]">|</span>
          <span>ActiveKids</span>
        </div>
      </section>

      {/* Top Rated Venues & Interactive Results */}
      <section id="results" className="mx-auto max-w-7xl px-4 sm:px-8 mt-10 md:mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-brand-dark">
              Top Birthday Party Venues
            </h2>
            <p className="text-xs md:text-sm text-[#5E5E5E] mt-1">
              Every venue listed is verified for hosting kids&apos; birthday parties.
            </p>
          </div>
          <Link
            href="/#results"
            className="text-xs font-bold text-brand-dark hover:underline flex items-center gap-1"
          >
            See All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {/* Split Grid: Results List + Interactive Map */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <VenueList
              onVenueSelect={handleVenueSelect}
              selectedId={selectedVenue?.id}
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
              Party-Safe Verified
            </h3>
            <p className="text-sm text-[#5E5E5E] leading-relaxed">
              Every birthday venue is vetted for child safety, insurance, and hygiene standards.
            </p>
          </div>

          {/* Card 2: Instant Booking */}
          <div className="bg-white rounded-3xl border border-[#EBE5D3] p-8 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-full bg-[#E8D9FF] flex items-center justify-center mb-6 text-[#6B21A8]">
              <span className="material-symbols-outlined text-[24px]">bolt</span>
            </div>
            <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
              Book the Party Instantly
            </h3>
            <p className="text-sm text-[#5E5E5E] leading-relaxed">
              Pick a party package, choose your date, and lock in the birthday celebration in seconds.
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
            Join thousands of parents who&apos;ve booked safe, verified birthday party venues for their kids through KidSpot.
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
