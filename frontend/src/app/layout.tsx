import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import PlausibleProvider from 'next-plausible';
import { QueryProvider } from '@/providers/query-provider';
import { SearchProvider } from '@/hooks/use-search';
import { MapProvider } from '@/components/map/map-context';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'KidSpot London',
  description: 'Find child-friendly venues in London',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider
          domain="kidspot.london"
          trackOutboundLinks={true}
          proxy={true}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          <SearchProvider>
            <MapProvider>
              {children}
              <Toaster position="bottom-center" />
            </MapProvider>
          </SearchProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
