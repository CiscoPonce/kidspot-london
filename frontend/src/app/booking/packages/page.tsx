'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useBooking } from '@/context/booking-context';

interface PackageOption {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  priceBadge: string;
  popular?: boolean;
  image: string;
  features: { text: string; included: boolean }[];
}

const PACKAGES: PackageOption[] = [
  {
    id: 'standard',
    title: 'Standard Play',
    subtitle: '2 Hours of Access',
    price: 150,
    priceBadge: '£150',
    image: 'https://images.unsplash.com/photo-1566454825481-4e48f80aa4d7?q=80&w=800&auto=format&fit=crop',
    features: [
      { text: 'Up to 10 children', included: true },
      { text: 'Reserved party table', included: true },
      { text: 'Bring your own birthday cake & candles', included: true },
      { text: 'No hot food included (bring your own snacks)', included: false },
    ],
  },
  {
    id: 'ultimate',
    title: 'Ultimate Adventure',
    subtitle: '2.5 Hours + Food',
    price: 250,
    priceBadge: '£250',
    popular: true,
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop',
    features: [
      { text: 'Up to 15 children', included: true },
      { text: 'Private party room', included: true },
      { text: 'Hot food & unlimited squash', included: true },
      { text: 'Bring your own birthday cake & candles', included: true },
    ],
  },
  {
    id: 'exclusive',
    title: 'Exclusive Hire',
    subtitle: 'The Whole Place to Yourself',
    price: 400,
    priceBadge: '£400',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
    features: [
      { text: 'Up to 30 children', included: true },
      { text: 'Full venue exclusivity', included: true },
      { text: 'Dedicated party host & food', included: true },
      { text: 'Bring your own birthday cake & candles', included: true },
    ],
  },
];

export default function PackageSelectionPage() {
  const { booking, updateBooking } = useBooking();

  const handleSelectPackage = (pkg: PackageOption) => {
    updateBooking({
      packageId: pkg.id,
      packageTitle: pkg.title,
      packagePrice: pkg.price,
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-brand-dark pb-24 md:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 pt-8 md:pt-12">
        {/* Header Title */}
        <div className="max-w-2xl mb-8 md:mb-12">
          <h1 className="font-display text-3xl md:text-5xl font-extrabold text-brand-dark tracking-tight leading-tight">
            Select Your Package
          </h1>
          <p className="mt-3 text-sm md:text-base text-[#5E5E5E] leading-relaxed">
            Choose the perfect level of adventure for your party. All packages include standard access to the main play areas.
          </p>
        </div>

        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Package Options List */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {PACKAGES.map((pkg) => {
              const isSelected = pkg.id === booking.packageId;
              return (
                <div
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`cursor-pointer rounded-3xl bg-white p-6 border transition-all flex flex-col md:flex-row items-center gap-6 relative shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-2 border-brand-yellow ring-2 ring-brand-yellow/30'
                      : 'border-[#EBE5D3]'
                  }`}
                >
                  {/* Package Image */}
                  <div className="relative w-full md:w-48 h-36 rounded-2xl overflow-hidden shrink-0">
                    <Image
                      src={pkg.image}
                      alt={pkg.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Package Details */}
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-bold text-brand-dark">
                          {pkg.title}
                        </h3>
                        {pkg.popular && (
                          <span className="rounded-full bg-badge-purple px-2.5 py-0.5 text-[10px] font-extrabold text-[#6B21A8]">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="rounded-full bg-brand-yellow px-4 py-1.5 text-sm font-extrabold text-brand-dark shadow-sm">
                        {pkg.priceBadge}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#5E5E5E] mb-4">
                      {pkg.subtitle}
                    </p>

                    {/* Features List */}
                    <div className="flex flex-col gap-1.5">
                      {pkg.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-medium text-brand-dark">
                          <span
                            className={`material-symbols-outlined text-[16px] ${
                              feat.included ? 'text-green-600' : 'text-rose-500'
                            }`}
                          >
                            {feat.included ? 'check_circle' : 'cancel'}
                          </span>
                          <span>{feat.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Sticky Booking Summary Card */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="bg-[#F7F3E6] rounded-3xl p-6 border border-[#EBE5D3] shadow-md">
              <h3 className="font-display text-xl font-bold text-brand-dark mb-6 border-b border-[#EBE5D3] pb-4">
                Booking Summary
              </h3>

              <div className="space-y-4 text-xs font-medium text-brand-dark">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] text-[#5E5E5E] mt-0.5">
                    calendar_today
                  </span>
                  <div>
                    <span className="text-[#5E5E5E] block">Date</span>
                    <span className="font-bold text-sm">{booking.date}</span>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] text-[#5E5E5E] mt-0.5">
                    schedule
                  </span>
                  <div>
                    <span className="text-[#5E5E5E] block">Time</span>
                    <span className="font-bold text-sm">{booking.timeSlot}</span>
                  </div>
                </div>

                {/* Venue */}
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] text-[#5E5E5E] mt-0.5">
                    location_on
                  </span>
                  <div>
                    <span className="text-[#5E5E5E] block">Venue</span>
                    <span className="font-bold text-sm">{booking.venueName}</span>
                  </div>
                </div>

                <hr className="border-[#EBE5D3] my-4" />

                {/* Selected Package & Price */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5E5E5E]">Selected Package</span>
                  <span className="font-bold">{booking.packageTitle}</span>
                </div>

                {booking.cateringAddon && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5E5E5E]">Catering Add-on</span>
                    <span className="font-bold">+£{booking.cateringPrice}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-base pt-2 border-t border-[#EBE5D3]">
                  <span className="font-bold text-brand-dark">Total</span>
                  <span className="font-extrabold text-xl text-brand-dark">
                    £{booking.totalPrice}
                  </span>
                </div>
              </div>

              {/* Continue Button */}
              <div className="mt-8">
                <Link
                  href="/booking/confirmation"
                  className="w-full inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-dark text-sm font-extrabold py-3.5 px-6 rounded-full hover:bg-brand-yellow-hover active:scale-95 transition-all shadow-md"
                >
                  Continue to Checkout
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
