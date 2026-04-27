'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { SearchProvider } from '@/hooks/use-search';
import { MapProvider } from '@/components/map/map-context';
import { ThemeProvider } from '@/components/theme-provider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SearchProvider>
          <MapProvider>
            {children}
          </MapProvider>
        </SearchProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
