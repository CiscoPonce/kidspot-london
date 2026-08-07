'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { SearchProvider } from '@/hooks/use-search';
import { MapProvider } from '@/components/map/map-context';
import { ThemeProvider } from '@/components/theme-provider';
import { BookingProvider } from '@/context/booking-context';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SearchProvider>
          <MapProvider>
            <BookingProvider>
              {children}
            </BookingProvider>
          </MapProvider>
        </SearchProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
