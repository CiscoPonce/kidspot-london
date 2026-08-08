'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { VenueMapSnippet } from '@/components/map/venue-map-snippet';
import { ShareButton } from '@/components/venues/share-button';
import { VenueImagePlaceholder } from '@/components/venues/venue-image-placeholder';
import { type Venue, type VenueDetails } from '@/lib/api';
import { collectVenueImages, formatPartyPrice } from '@/lib/venue-images';
import { trustSignals } from '@/lib/trust';
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
  /** Mobile bottom-sheet: single-column, shorter gallery */
  compact?: boolean;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function VenueDetailContent({ venue, details, compact }: VenueDetailContentProps) {
  const { has, toggle } = useShortlist();
  const { updateBooking } = useBooking();
  const isSaved = has(venue.id);
  const [selectedDate, setSelectedDate] = useState(todayIso());

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('kidspot_search_date');
      if (saved) setSelectedDate(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const galleryImages = collectVenueImages(venue, details);
  const priceLabel = formatPartyPrice(venue);
  const basePrice = typeof venue.party_price_from === 'number' ? venue.party_price_from : null;
  const capacity = venue.party_max_capacity;
  const signals = trustSignals(venue);
  const borough =
    (venue as Venue & { london_borough?: string }).london_borough ||
    venue.borough ||
    'London';
  const enquiryUrl =
    venue.party_enquiry_url || venue.booking_url || venue.website || null;
  const features = venue.features?.length
    ? venue.features
    : details?.features?.length
      ? details.features
      : [];

  return (
    <div className="min-h-screen bg-[#FFFDF5] pb-24 text-brand-dark md:pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
        <nav className="flex items-center gap-2 text-xs font-semibold text-[#5E5E5E]">
          <Link href="/" className="hover:text-brand-dark">
            Venues
          </Link>
          <span>›</span>
          <span className="capitalize">{venue.type?.replace(/_/g, ' ') || 'Venue'}</span>
          <span>›</span>
          <span className="font-bold text-brand-dark">{venue.name}</span>
        </nav>

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-dark md:text-5xl">
              {venue.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#5E5E5E]">
              {venue.rating != null && (
                <>
                  <span className="flex items-center gap-1 text-brand-dark">
                    ★ {Number(venue.rating).toFixed(1)}
                    {venue.user_ratings_total
                      ? ` (${venue.user_ratings_total} reviews)`
                      : ''}
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="flex items-center gap-1">📍 {borough}</span>
              {venue.party_capable && (
                <>
                  <span>•</span>
                  <span className="text-[#9F1239]">🎂 Birthday parties</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ShareButton title={venue.name} />
            <button
              type="button"
              onClick={() => toggle(venue)}
              aria-label="Save venue"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EBE5D3] bg-white shadow-sm transition hover:bg-[#F9F5E8] active:scale-95"
            >
              <span
                className={`material-symbols-outlined text-[20px] ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#5E5E5E]'}`}
              >
                {isSaved ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          </div>
        </div>

        {/* Photo gallery — fixed 2:1 grid ratio */}
        <div
          className={`mt-6 grid gap-2 ${compact ? 'grid-cols-1' : 'h-[240px] grid-cols-2 grid-rows-2 sm:h-[320px] md:h-[420px] md:gap-4'}`}
        >
          <div
            className={`relative overflow-hidden rounded-2xl border border-[#EBE5D3] shadow-sm ${
              compact ? 'aspect-[16/10]' : 'row-span-2 min-h-0'
            }`}
          >
            {galleryImages[0] ? (
              <img
                src={galleryImages[0]}
                alt={venue.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <VenueImagePlaceholder type={venue.type} name={venue.name} />
            )}
            {signals.length > 0 && (
              <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
                {signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-extrabold text-brand-dark shadow-md backdrop-blur-sm md:px-4 md:py-1.5 md:text-xs"
                  >
                    <span className={`material-symbols-outlined text-[14px] md:text-[16px] ${signal.tone === 'verified' ? 'text-green-600' : 'text-brand-dark'}`}>
                      {signal.icon}
                    </span>
                    {signal.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!compact &&
            [1, 2].map((idx) => (
              <div
                key={idx}
                className="relative min-h-0 overflow-hidden rounded-2xl border border-[#EBE5D3] shadow-sm"
              >
                {galleryImages[idx] ? (
                  <img
                    src={galleryImages[idx]}
                    alt={`${venue.name} photo ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <VenueImagePlaceholder type={venue.type} name={venue.name} />
                )}
              </div>
            ))}
        </div>

        <div className={`mt-8 grid grid-cols-1 gap-8 ${compact ? '' : 'lg:grid-cols-12'}`}>
          <div className={`space-y-8 ${compact ? '' : 'lg:col-span-8'}`}>
            <div className="flex flex-wrap items-center gap-3">
              {capacity != null && (
                <span className="rounded-full bg-badge-pink px-4 py-1.5 text-xs font-bold text-[#9F1239]">
                  🎉 Up to {capacity} kids
                </span>
              )}
              {venue.party_capable && (
                <span className="rounded-full bg-badge-yellow px-4 py-1.5 text-xs font-bold text-[#696200]">
                  🎂 Party packages available
                </span>
              )}
              {venue.phone && (
                <span className="rounded-full bg-[#EAE5D4] px-4 py-1.5 text-xs font-bold text-brand-dark">
                  📞 {venue.phone}
                </span>
              )}
            </div>

            <div className="rounded-3xl border border-[#EBE5D3] bg-white p-8 shadow-sm">
              <h2 className="mb-4 font-display text-2xl font-extrabold text-brand-dark">
                About this venue
              </h2>
              <p className="text-sm leading-relaxed text-[#5E5E5E]">
                {venue.description ||
                  details?.description ||
                  `${venue.name} is a child-friendly venue in ${borough}. Contact the venue directly for birthday party availability, pricing, and capacity.`}
              </p>
              {(venue.address || venue.postcode) && (
                <p className="mt-3 text-sm text-[#5E5E5E]">
                  {[venue.address, venue.postcode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {features.length > 0 && (
              <div className="rounded-3xl border border-[#EBE5D3] bg-white p-8 shadow-sm">
                <h3 className="mb-4 font-display text-lg font-bold text-brand-dark">
                  Amenities
                </h3>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm font-medium text-brand-dark"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        check_circle
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-[#EBE5D3] bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-display text-lg font-bold text-brand-dark">
                Location & Map
              </h3>
              <div className="h-64 overflow-hidden rounded-2xl">
                <VenueMapSnippet
                  lat={venue.lat || 51.5074}
                  lon={venue.lon || -0.1278}
                  name={venue.name}
                />
              </div>
            </div>

            {(venue.phone || venue.website || venue.email) && (
              <div className="rounded-3xl border border-[#EBE5D3] bg-white p-8 shadow-sm">
                <h3 className="mb-4 font-display text-lg font-bold text-brand-dark">
                  Contact
                </h3>
                <div className="space-y-2 text-sm">
                  {venue.phone && (
                    <a
                      href={`tel:${venue.phone}`}
                      className="flex items-center gap-2 font-semibold text-brand-dark hover:underline"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                      {venue.phone}
                    </a>
                  )}
                  {venue.website && (
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-semibold text-brand-dark hover:underline"
                    >
                      <span className="material-symbols-outlined text-[18px]">language</span>
                      Visit website
                    </a>
                  )}
                  {venue.email && (
                    <a
                      href={`mailto:${venue.email}`}
                      className="flex items-center gap-2 font-semibold text-brand-dark hover:underline"
                    >
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                      {venue.email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Booking widget */}
          <aside className={compact ? 'mt-4' : 'lg:col-span-4 lg:sticky lg:top-24'}>
            <div className="rounded-3xl border border-[#EBE5D3] bg-white p-6 shadow-lg">
              <div className="mb-6">
                {priceLabel ? (
                  <>
                    <span className="font-display text-3xl font-extrabold text-brand-dark">
                      {priceLabel.split(' ')[0]}
                    </span>
                    <span className="ml-1 text-xs font-semibold text-[#5E5E5E]">
                      {priceLabel.replace(/^£[\d.]+/, '').trim() || 'per party'}
                    </span>
                  </>
                ) : (
                  <span className="font-display text-xl font-extrabold text-brand-dark">
                    Contact for pricing
                  </span>
                )}
                {capacity != null && (
                  <p className="mt-1 text-[11px] text-[#5E5E5E]">
                    Capacity up to {capacity} children
                  </p>
                )}
              </div>

              <div className="space-y-4 text-xs font-semibold text-brand-dark">
                <div className="rounded-2xl border border-[#EBE5D3] bg-[#F7F3E6] p-3">
                  <label className="mb-1 block text-[10px] font-bold uppercase text-[#7B785F]">
                    Preferred party date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayIso()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="hero-date-input w-full bg-transparent text-sm font-bold outline-none"
                  />
                  <p className="mt-2 text-[10px] font-medium text-[#7B785F]">
                    We&apos;ll pass this to the venue when you enquire. Availability is confirmed directly with them.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {enquiryUrl ? (
                  <a
                    href={enquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      updateBooking({
                        venueId: venue.id,
                        venueName: venue.name,
                        venueAddress: venue.address || borough,
                        date: formatDateLabel(selectedDate),
                        timeSlot: '',
                        cateringAddon: false,
                        packagePrice: basePrice ?? 0,
                      });
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-yellow py-4 px-6 text-sm font-extrabold text-brand-dark shadow-md transition-all hover:bg-brand-yellow-hover active:scale-95"
                  >
                    Enquire about a party
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </a>
                ) : venue.phone ? (
                  <a
                    href={`tel:${venue.phone}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-yellow py-4 px-6 text-sm font-extrabold text-brand-dark shadow-md transition-all hover:bg-brand-yellow-hover active:scale-95"
                  >
                    Call to enquire
                    <span className="material-symbols-outlined text-[18px]">call</span>
                  </a>
                ) : (
                  <Link
                    href="/booking/packages"
                    onClick={() => {
                      updateBooking({
                        venueId: venue.id,
                        venueName: venue.name,
                        venueAddress: venue.address || borough,
                        date: formatDateLabel(selectedDate),
                        timeSlot: '',
                        cateringAddon: false,
                        packagePrice: basePrice ?? 0,
                      });
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-yellow py-4 px-6 text-sm font-extrabold text-brand-dark shadow-md transition-all hover:bg-brand-yellow-hover active:scale-95"
                  >
                    View party options
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                )}
                <p className="text-center text-[10px] font-medium text-[#7B785F]">
                  {enquiryUrl
                    ? 'Opens the venue website — check packages, times and availability there'
                    : venue.phone
                      ? 'Speak to the venue about dates, capacity and pricing'
                      : 'Browse available party packages'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
