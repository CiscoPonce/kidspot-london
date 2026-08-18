'use client';

import React from 'react';
import type { Venue, VenueDetails } from '@/lib/api';

interface PartyCateringBadgeProps {
  venue: Venue | VenueDetails;
  compact?: boolean;
}

export function PartyCateringBadge({ venue, compact = false }: PartyCateringBadgeProps) {
  const isPartyCapable = venue.party_capable === true || venue.type === 'softplay' || venue.type === 'community_hall';
  if (!isPartyCapable) return null;

  const isHall = venue.type === 'community_hall';
  const isSoftplay = venue.type === 'softplay';

  const byoAllowed = venue.byo_food_allowed ?? isHall;
  const foodProvided = venue.food_provided ?? isSoftplay;
  const hasKitchen = venue.kitchen_facilities ?? isHall;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 border border-rose-200">
          🎂 BYO Cake Welcome
        </span>
        {byoAllowed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
            🥪 BYO Food OK
          </span>
        )}
        {foodProvided && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 border border-amber-200">
            🍕 Food Included
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#EBE5D3] bg-[#FCFBF7] p-4 shadow-sm">
      <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-brand-dark mb-3">
        <span className="material-symbols-outlined text-[18px] text-amber-600">restaurant</span>
        Food & Birthday Cake Policy
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Cake Policy */}
        <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-[#EBE5D3]">
          <span className="text-lg">🎂</span>
          <div>
            <div className="font-bold text-brand-dark">Bring Your Own Cake</div>
            <div className="text-[11px] text-[#5E5E5E] mt-0.5">
              Parents bring their own birthday cake, candles & napkins (standard for all venues).
            </div>
          </div>
        </div>

        {/* Catering Policy */}
        <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-[#EBE5D3]">
          <span className="text-lg">{byoAllowed ? '🥪' : '🍕'}</span>
          <div>
            <div className="font-bold text-brand-dark">
              {byoAllowed ? 'Self-Catering / BYO Allowed' : 'Food Package Included'}
            </div>
            <div className="text-[11px] text-[#5E5E5E] mt-0.5">
              {byoAllowed
                ? 'You can bring your own party snacks, drinks & external catering.'
                : 'In-house party food & drinks provided with package.'}
            </div>
          </div>
        </div>

        {/* Kitchen Access (if available or hall) */}
        {hasKitchen && (
          <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-[#EBE5D3] sm:col-span-2">
            <span className="text-lg">☕</span>
            <div>
              <div className="font-bold text-brand-dark">Kitchen & Amenities Available</div>
              <div className="text-[11px] text-[#5E5E5E] mt-0.5">
                Access to kitchen, fridge or hot water urn for parent tea & coffee.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
