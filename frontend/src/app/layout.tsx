import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import PlausibleProvider from 'next-plausible';
import { QueryProvider } from '@/providers/query-provider';
import { SearchProvider } from '@/hooks/use-search';
import { MapProvider } from '@/components/map/map-context';
import { FeedbackButton } from '@/components/feedback-button';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
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
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-body-text antialiased bg-pure-white text-absolute-black`}>
        <QueryProvider>
          <SearchProvider>
            <MapProvider>
              {children}
              <FeedbackButton />
              <Toaster position="bottom-center" />
            </MapProvider>
          </SearchProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
