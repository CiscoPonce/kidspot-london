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

  // Fetch venue details
  const { data: details, isLoading, isError, refetch } = useQuery({
    queryKey: ['venueDetails', venue.id],
    queryFn: () => getVenueDetails(venue.id),
    enabled: isOpen,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Body scroll lock
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

  // Swipe down to close (mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta > 80) {
        onClose();
      }
      touchStartY.current = null;
    },
    [onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${venue.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal panel */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={[
          'relative z-10 w-full bg-white shadow-xl',
          'rounded-t-2xl sm:rounded-2xl',
          'sm:mx-4 sm:max-w-md',
          'max-h-[90vh] overflow-hidden',
          'animate-slide-up sm:animate-fade-in',
        ].join(' ')}
        style={{
          // Fallback animation via inline style for sheet entrance
          animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          @media (min-width: 640px) {
            @keyframes slideUp {
              from { transform: scale(0.96); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
          }
        `}</style>

        <VenueDetailContent
          venue={venue}
          details={details}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onClose={onClose}
        />
      </div>
    </div>
  );

  // Render into document.body via portal
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
