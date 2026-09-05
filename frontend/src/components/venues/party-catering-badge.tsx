'use client';

import React from 'react';
import type { Venue, VenueDetails } from '@/lib/api';

interface PartyCateringBadgeProps {
  venue: Venue | VenueDetails;
  compact?: boolean;
}

export function PartyCateringBadge({ venue, compact = false }: PartyCateringBadgeProps) {
  const byoAllowed = venue.byo_food_allowed === true;
  const foodProvided = venue.food_provided === true;
  const hasKitchen = venue.kitchen_facilities === true;
  const notes = venue.catering_notes?.trim();

  if (compact) {
    if (!byoAllowed && !foodProvided) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-semibold">
        {byoAllowed && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
            BYO food
          </span>
        )}
        {foodProvided && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">
            Food included
          </span>
        )}
      </div>
    );
  }

  if (!byoAllowed && !foodProvided && !hasKitchen && !notes) {
    return (
      <div className="rounded-xl border border-brand-border bg-white p-4">
        <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-brand-dark">
          Food & birthday cake
        </h4>
        <p className="text-sm text-brand-muted">
          Ask the venue when you call. We only show cake or catering rules here when we have
          confirmed them.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-border bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-brand-dark">
        <span className="material-symbols-outlined text-[18px] text-amber-600">restaurant</span>
        Food & birthday cake
      </h4>

      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        {byoAllowed && (
          <div className="flex items-start gap-2.5 rounded-xl border border-brand-border bg-white p-3">
            <span className="text-lg">🥪</span>
            <div>
              <div className="font-bold text-brand-dark">BYO food allowed</div>
              <div className="mt-0.5 text-[11px] text-[#5E5E5E]">
                Confirmed: you can bring your own party food.
              </div>
            </div>
          </div>
        )}

        {foodProvided && (
          <div className="flex items-start gap-2.5 rounded-xl border border-brand-border bg-white p-3">
            <span className="text-lg">🍕</span>
            <div>
              <div className="font-bold text-brand-dark">Food package included</div>
              <div className="mt-0.5 text-[11px] text-[#5E5E5E]">
                Confirmed: in-house party food is part of the booking.
              </div>
            </div>
          </div>
        )}

        {hasKitchen && (
          <div className="flex items-start gap-2.5 rounded-xl border border-brand-border bg-white p-3 sm:col-span-2">
            <span className="text-lg">☕</span>
            <div>
              <div className="font-bold text-brand-dark">Kitchen access</div>
              <div className="mt-0.5 text-[11px] text-[#5E5E5E]">
                Confirmed: kitchen or hot-water facilities on site.
              </div>
            </div>
          </div>
        )}
      </div>
      {notes && <p className="mt-3 text-xs text-brand-muted">{notes}</p>}
    </div>
  );
}
