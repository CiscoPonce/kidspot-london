'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BookingDetails {
  venueId?: string | number;
  venueName: string;
  venueAddress: string;
  packageId: string;
  packageTitle: string;
  packagePrice: number;
  date: string;
  timeSlot: string;
  cateringAddon: boolean;
  cateringPrice: number;
  childName: string;
  turningAge: number;
  headcount: number;
  totalPrice: number;
  bookingRef: string;
}

interface BookingContextValue {
  booking: BookingDetails;
  updateBooking: (details: Partial<BookingDetails>) => void;
  resetBooking: () => void;
}

const DEFAULT_BOOKING: BookingDetails = {
  venueId: '399',
  venueName: 'Cosmic Bounce Center',
  venueAddress: 'High Street, Camden, London NW1 8NJ',
  packageId: 'ultimate',
  packageTitle: 'Ultimate Adventure',
  packagePrice: 250,
  date: 'Saturday, Nov 12, 2026',
  timeSlot: '14:00 - 16:00',
  cateringAddon: true,
  cateringPrice: 45,
  childName: 'Leo',
  turningAge: 6,
  headcount: 15,
  totalPrice: 300,
  bookingRef: '#KS-8492-AX',
};

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [booking, setBooking] = useState<BookingDetails>(DEFAULT_BOOKING);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kidspot_booking');
      if (saved) {
        setBooking(JSON.parse(saved));
      }
    } catch {
      // Fallback to default state
    }
  }, []);

  const updateBooking = (details: Partial<BookingDetails>) => {
    setBooking((prev) => {
      const updated = { ...prev, ...details };
      const base = updated.packagePrice || 150;
      const catering = updated.cateringAddon ? updated.cateringPrice || 45 : 0;
      const service = 5;
      updated.totalPrice = base + catering + service;
      try {
        localStorage.setItem('kidspot_booking', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  const resetBooking = () => {
    setBooking(DEFAULT_BOOKING);
    try {
      localStorage.removeItem('kidspot_booking');
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <BookingContext.Provider value={{ booking, updateBooking, resetBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
