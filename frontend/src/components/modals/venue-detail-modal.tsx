'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { getVenueDetails } from '@/lib/api';
import { VenueDetailContent } from '@/components/venues/venue-detail-content';
import type { Venue } from '@/lib/api';

export interface VenueDetailModalProps {
  venue: Venue;
  isOpen: boolean;
  onClose: () => void;
}

export function VenueDetailModal({ venue, isOpen, onClose }: VenueDetailModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const { data: details, isLoading, isError, refetch } = useQuery({
    queryKey: ['venueDetails', venue.id],
    queryFn: () => getVenueDetails(venue.id),
    enabled: isOpen,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta > 80) onClose();
      touchStartY.current = null;
    },
    [onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${venue.name}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#FFFDF5] shadow-xl"
      >
        {/* Drag handle + close */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#EBE5D3] px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#CCC7AB]" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <VenueDetailContent
            venue={details?.data?.basic || venue}
            details={details?.data?.details}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            onClose={onClose}
            compact
          />
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
