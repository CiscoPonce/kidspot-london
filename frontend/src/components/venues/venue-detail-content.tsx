'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { VenueMapSnippet } from '@/components/map/venue-map-snippet';
import { ShareButton } from '@/components/venues/share-button';
import { type Venue, type VenueDetails } from '@/lib/api';
import { useShortlist } from '@/hooks/use-shortlist';
import { useBooking } from '@/context/booking-context';

interface VenueDetailContentProps {
  venue: Venue;
  details?: VenueDetails;
  showCloseButton?: boolean;
  onClose?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function VenueDetailContent({
  venue,
  details,
}: VenueDetailContentProps) {
  const { has, toggle } = useShortlist();
  const { updateBooking } = useBooking();
  const isSaved = has(venue.id);
  const [cateringAddon, setCateringAddon] = useState(false);
  const [selectedDate, setSelectedDate] = useState('Saturday, Nov 18, 2026');
  const [selectedTime, setSelectedTime] = useState('10:00 AM - 12:00 PM');

  const basePrice = typeof venue.party_price_from === 'number' ? venue.party_price_from : 150;
  const serviceFee = 5;
  const cateringCost = cateringAddon ? 45 : 0;
  const totalPrice = basePrice + serviceFee + cateringCost;

  const galleryImages = [
    venue.image_url || 'https://images.unsplash.com/photo-1566454825481-4e48f80aa4d7?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
  ];

  return (
    <div className="bg-[#FFFDF5] text-brand-dark min-h-screen pb-24 md:pb-16">
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-8 pt-6">
        <nav className="flex items-center gap-2 text-xs font-semibold text-[#5E5E5E]">
          <Link href="/" className="hover:text-brand-dark">
            Venues
          </Link>
          <span>›</span>
          <span className="capitalize">{venue.type?.replace('_', ' ') || 'Indoor Play'}</span>
          <span>›</span>
          <span className="text-brand-dark font-bold">{venue.name}</span>
        </nav>

        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-brand-dark">
              {venue.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-[#5E5E5E]">
              <span className="flex items-center gap-1 text-brand-dark">
                ★ {Number(venue.rating || 4.8).toFixed(1)} ({venue.user_ratings_total || 124} reviews)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                📍 {(venue as any).london_borough || venue.borough || 'London'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ShareButton title={venue.name} />
            <button
              type="button"
              onClick={() => toggle(venue)}
              aria-label="Save venue"
              className="w-10 h-10 rounded-full bg-white border border-[#EBE5D3] flex items-center justify-center shadow-sm hover:bg-[#F9F5E8] active:scale-95 transition"
            >
              <span className={`material-symbols-outlined text-[20px] ${isSaved ? 'text-rose-500 fill-rose-500' : 'text-[#5E5E5E]'}`}>
                {isSaved ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Main Large Photo */}
          <div className="md:col-span-2 relative h-[320px] md:h-[420px] rounded-3xl overflow-hidden border border-[#EBE5D3] shadow-sm">
            <Image
              src={galleryImages[0]}
              alt={venue.name}
              fill
              priority
              className="object-cover"
            />
            {/* Safe-checked Badge Overlay */}
            <div className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-4 py-1.5 text-xs font-extrabold text-brand-dark shadow-md">
              <span className="material-symbols-outlined text-[16px] text-green-600">
                verified
              </span>
              Safety-checked
            </div>
          </div>

          {/* Right 2 Stacked Photos */}
          <div className="grid grid-rows-2 gap-4 h-[320px] md:h-[420px]">
            <div className="relative rounded-3xl overflow-hidden border border-[#EBE5D3] shadow-sm">
              <Image
                src={galleryImages[1]}
                alt={`${venue.name} interior`}
                fill
                className="object-cover"
              />
            </div>
            <div className="relative rounded-3xl overflow-hidden border border-[#EBE5D3] shadow-sm">
              <Image
                src={galleryImages[2]}
                alt={`${venue.name} play area`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-brand-dark shadow-sm hover:bg-white transition"
              >
                <span className="material-symbols-outlined text-[14px]">grid_view</span>
                Show all photos
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Layout (Left Column Details, Right Column Booking Widget) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Tag Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-badge-pink px-4 py-1.5 text-xs font-bold text-[#9F1239]">
                🎉 Up to {venue.party_max_capacity || 30} Kids
              </span>
              <span className="rounded-full bg-badge-yellow px-4 py-1.5 text-xs font-bold text-[#696200]">
                🎂 Ages 2-8
              </span>
              <span className="rounded-full bg-[#EAE5D4] px-4 py-1.5 text-xs font-bold text-brand-dark">
                ⏱️ 2 Hour Slots
              </span>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-3xl p-8 border border-[#EBE5D3] shadow-sm">
              <h2 className="font-display text-2xl font-extrabold text-brand-dark mb-4">
                About this venue
              </h2>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                {venue.description ||
                  `Welcome to ${venue.name}, an immersive indoor play experience designed to spark imagination and encourage physical activity in a safe, controlled environment. Features integrated slides, soft play mazes, ball pits, and interactive sensory play.`}
              </p>
              <p className="text-sm text-[#5E5E5E] leading-relaxed mt-4">
                Parents can relax in our dedicated viewing café, enjoying premium coffee and snacks while keeping a close eye on the action. Every piece of equipment is sanitized daily and undergoes rigorous weekly safety checks.
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="bg-white rounded-3xl p-8 border border-[#EBE5D3] shadow-sm">
              <h3 className="font-display text-lg font-bold text-brand-dark mb-6">
                Amenities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm font-medium text-brand-dark">
                  <span className="material-symbols-outlined text-[20px] text-brand-dark">restaurant</span>
                  On-site Catering available
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-brand-dark">
                  <span className="material-symbols-outlined text-[20px] text-brand-dark">local_parking</span>
                  Free Private Parking
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-brand-dark">
                  <span className="material-symbols-outlined text-[20px] text-brand-dark">wifi</span>
                  High-speed Parent WiFi
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-brand-dark">
                  <span className="material-symbols-outlined text-[20px] text-brand-dark">family_restroom</span>
                  Family Restrooms
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-brand-dark">
                  <span className="material-symbols-outlined text-[20px] text-brand-dark">accessible</span>
                  Wheelchair Accessible
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-brand-dark">
                  <span className="material-symbols-outlined text-[20px] text-brand-dark">ac_unit</span>
                  Air Conditioned
                </div>
              </div>
            </div>

            {/* Map Snippet */}
            <div className="bg-white rounded-3xl p-6 border border-[#EBE5D3] shadow-sm overflow-hidden">
              <h3 className="font-display text-lg font-bold text-brand-dark mb-4">
                Location & Map
              </h3>
              <div className="h-64 rounded-2xl overflow-hidden">
                <VenueMapSnippet lat={venue.lat || 51.5074} lon={venue.lon || -0.1278} name={venue.name} />
              </div>
            </div>

            {/* Customer Reviews Section */}
            <div className="bg-white rounded-3xl p-8 border border-[#EBE5D3] shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b border-[#EBE5D3] pb-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-brand-dark">
                    4.8 / 5
                  </h3>
                  <p className="text-xs text-[#5E5E5E]">Based on 124 reviews</p>
                </div>
                <span className="text-amber-400 text-lg">★★★★★</span>
              </div>

              <div className="space-y-6">
                <div className="border-b border-[#EBE5D3] pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-brand-dark">Sarah Mitchell</span>
                    <span className="text-xs text-[#5E5E5E]">October 2023</span>
                  </div>
                  <p className="text-xs text-[#5E5E5E] leading-relaxed">
                    "Absolutely fantastic venue for my daughter's 5th birthday. The staff were incredibly attentive, the play area is spotless, and the food provided was great quality."
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-brand-dark">James Patterson</span>
                    <span className="text-xs text-[#5E5E5E]">September 2023</span>
                  </div>
                  <p className="text-xs text-[#5E5E5E] leading-relaxed">
                    "Great space, very secure. You can tell they take safety seriously which gave us peace of mind. Overall a top-tier soft play."
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 w-full py-3 rounded-full border border-[#EBE5D3] text-xs font-bold text-brand-dark hover:bg-[#F9F5E8] transition"
              >
                Read all 124 reviews
              </button>
            </div>
          </div>

          {/* Right Column: Sticky Booking Widget (Design 5) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-3xl p-6 border border-[#EBE5D3] shadow-lg">
              <div className="mb-6">
                <span className="font-display text-3xl font-extrabold text-brand-dark">
                  £{basePrice}
                </span>
                <span className="text-xs font-semibold text-[#5E5E5E] ml-1">per party</span>
                <p className="text-[11px] text-[#5E5E5E] mt-1">Includes entry for up to 30 children</p>
              </div>

              {/* Date Input */}
              <div className="space-y-4 text-xs font-semibold text-brand-dark">
                <div className="bg-[#F7F3E6] rounded-2xl p-3 border border-[#EBE5D3]">
                  <label className="text-[10px] text-[#7B785F] uppercase font-bold block mb-1">
                    DATE
                  </label>
                  <input
                    type="text"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-transparent font-bold text-sm outline-none"
                  />
                </div>

                {/* Time Slot Input */}
                <div className="bg-[#F7F3E6] rounded-2xl p-3 border border-[#EBE5D3]">
                  <label className="text-[10px] text-[#7B785F] uppercase font-bold block mb-1">
                    TIME SLOT
                  </label>
                  <input
                    type="text"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-transparent font-bold text-sm outline-none"
                  />
                </div>

                {/* Catering Checkbox Addon */}
                <div
                  onClick={() => setCateringAddon(!cateringAddon)}
                  className="bg-[#F7F3E6] rounded-2xl p-3 border border-[#EBE5D3] flex items-center justify-between cursor-pointer hover:bg-[#F3EEDA] transition"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cateringAddon}
                      onChange={() => {}}
                      className="w-4 h-4 accent-brand-dark rounded"
                    />
                    <span className="text-xs font-bold">Add Catering Box</span>
                  </div>
                  <span className="text-xs font-bold text-brand-dark">+£45</span>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-2 border-t border-[#EBE5D3] pt-4 text-xs">
                  <div className="flex justify-between text-[#5E5E5E]">
                    <span>Base Price (2 Hours)</span>
                    <span>£{basePrice.toFixed(2)}</span>
                  </div>
                  {cateringAddon && (
                    <div className="flex justify-between text-[#5E5E5E]">
                      <span>Catering Addon</span>
                      <span>£45.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5E5E5E]">
                    <span>Service Fee</span>
                    <span>£{serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-brand-dark pt-2 border-t border-[#EBE5D3]">
                    <span>Total</span>
                    <span>£{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Book Now Yellow CTA Button */}
              <div className="mt-6">
                <Link
                  href="/booking/packages"
                  onClick={() => {
                    updateBooking({
                      venueId: venue.id,
                      venueName: venue.name,
                      venueAddress: (venue as any).address || venue.borough || 'London',
                      date: selectedDate,
                      timeSlot: selectedTime,
                      cateringAddon,
                      cateringPrice: 45,
                      packagePrice: basePrice,
                    });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-dark text-sm font-extrabold py-4 px-6 rounded-full hover:bg-brand-yellow-hover active:scale-95 transition-all shadow-md"
                >
                  Book Now
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                <p className="text-[10px] text-center text-[#7B785F] mt-2 font-medium">
                  You won't be charged yet
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
